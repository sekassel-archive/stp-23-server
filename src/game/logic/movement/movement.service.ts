import {Injectable, Logger, OnApplicationBootstrap} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Types} from 'mongoose';
import * as fs from 'node:fs/promises';
import {SocketService} from '../../../udp/socket.service';
import {Area} from '../../area/area.schema';
import {AreaService} from '../../area/area.service';
import {TALL_GRASS_ENCOUNTER_CHANCE} from '../../constants';
import {Chunk, getProperty, TiledObject} from '../../tiled-map.interface';
import {MoveTrainerDto} from '../../trainer/trainer.dto';
import {Direction, Trainer} from '../../trainer/trainer.schema';
import {TrainerService} from '../../trainer/trainer.service';
import {BattleSetupService} from '../battle-setup/battle-setup.service';
import {ValidatedEvent, VALIDATION_PIPE} from "../../../util/validated.decorator";
import {notFound} from "@mean-stream/nestx";
import BitSet from "bitset";

export interface AreaInfo {
  width: number;
  height: number;
  objects: GameObject[];
  walkable: BitSet;
  tallGrass: BitSet;
}

export interface TilesetInfo {
  firstgid?: number;
  walkable: BitSet;
  tallGrass: BitSet;
}

export interface BaseGameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Portal extends BaseGameObject {
  type: 'Portal';
  target: {
    area: string;
    x: number;
    y: number;
  };
}

export interface TallGrass extends BaseGameObject {
  type: 'TallGrass';
  monsters: [number, number, number?][];
}

export type GameObject = Portal | TallGrass;

@Injectable()
export class MovementService implements OnApplicationBootstrap {
  logger = new Logger(MovementService.name, {timestamp: true});

  constructor(
    private trainerService: TrainerService,
    private socketService: SocketService,
    private areaService: AreaService,
    private battleSetupService: BattleSetupService,
  ) {
  }

  areas = new Map<string, AreaInfo>;

  async onApplicationBootstrap() {
    this.logger.log('Loading areas...');
    const areas = await this.areaService.findAll();
    const tilesets = new Map<string, TilesetInfo>();

    const tilesetNames = new Set<string>();
    for (const area of areas) {
      for (const {source} of area.map.tilesets) {
        tilesetNames.add(source.substring(source.lastIndexOf('/') + 1));
      }
    }
    this.logger.log('Loading tilesets...');
    await Promise.all([...tilesetNames].map(async name => {
      tilesets.set(name, await this.loadTileset(name));
    }));

    this.logger.log('Processing areas...');
    await Promise.all(areas.map(async area => {
      this.areas.set(area._id.toString(), await this.loadArea(area, areas, tilesets));
    }));
    this.logger.log('Initialized');
  }

  private async loadTileset(name: string): Promise<TilesetInfo> {
    const walkable = new BitSet();
    const tallGrass = new BitSet();
    const text = await fs.readFile(`./assets/tilesets/${name}`, 'utf8').catch(() => '{}');
    const tileset = JSON.parse(text);
    for (const tile of tileset.tiles || []) {
      for (const property of tile.properties) {
        if (!property.value) {
          continue;
        }
        switch (property.name) {
          case 'Walkable':
            walkable.set(tile.id);
            break;
          case 'TallGrass':
            tallGrass.set(tile.id);
            break;
        }
      }
    }
    return {walkable, tallGrass};
  }

  private loadArea(area: Area, areas: Area[], tilesets: Map<string, TilesetInfo>): AreaInfo {
    const width = Math.max(...area.map.layers.map(l => l.x + l.width || 0));
    const height = Math.max(...area.map.layers.map(l => l.y + l.height || 0));
    const objects: GameObject[] = [];
    const walkable = new BitSet();
    walkable.setRange(0, width * height);
    const tallGrass = new BitSet();

    const tilesetsWithFirstgid = area.map.tilesets.map(({source, firstgid}) => {
      const name = source.substring(source.lastIndexOf('/') + 1);
      const tileset = tilesets.get(name)!;
      return {firstgid, ...tileset};
    });

    for (const layer of area.map.layers) {
      switch (layer.type) {
        case 'objectgroup':
          for (const object of layer.objects) {
            const gameObject = this.loadObject(object, area, areas);
            gameObject && objects.push(gameObject);
          }
          break;
        case 'tilelayer':
          if (layer.data) {
            this.loadChunk(layer as Chunk, tilesetsWithFirstgid, width, walkable, tallGrass);
          } else if (layer.chunks) {
            for (const chunk of layer.chunks) {
              this.loadChunk(chunk, tilesetsWithFirstgid, width, walkable, tallGrass);
            }
          }
          break;
      }
    }

    return {width, height, objects, walkable, tallGrass};
  }

  private loadChunk(
    layer: Chunk, tilesetsWithFirstgid: Required<TilesetInfo>[], width: number,
    walkable: BitSet, tallGrass: BitSet,
  ) {
    for (let i = 0; i < layer.data.length; i++) {
      const tileId = layer.data[i];
      if (tileId === 0) {
        continue;
      }
      const tilesetRef = tilesetsWithFirstgid.find(tsr => tsr.firstgid <= tileId);
      if (!tilesetRef) {
        continue;
      }

      const x = layer.x + i % layer.width;
      const y = layer.y + (i / layer.width) | 0;
      const index = y * width + x;
      const tileIdInTileset = tileId - tilesetRef.firstgid;
      if (!tilesetRef.walkable.get(tileIdInTileset)) {
        walkable.clear(index);
      }
      if (tilesetRef.tallGrass.get(tileIdInTileset)) {
        tallGrass.set(index);
      }
    }
  }

  private loadObject(object: TiledObject, area: Area, areas: Area[]): GameObject | undefined {
    const x = object.x / area.map.tilewidth;
    const y = object.y / area.map.tileheight;
    const width = object.width / area.map.tilewidth;
    const height = object.height / area.map.tileheight;
    switch (object.type) {
      case 'Portal':
        const targetName = getProperty(object, 'Map');
        const targetArea = areas.find(a => a.name === targetName && a.region === area.region);
        if (!targetArea) {
          this.logger.warn(`Invalid portal target: ${targetName} in area ${area.name} object ${object.id}`);
          return;
        }
        return {
          type: 'Portal', x, y, width, height,
          target: {
            area: targetArea._id.toString(),
            x: getProperty<number>(object, 'X') || 0,
            y: getProperty<number>(object, 'Y') || 0,
          },
        };
      case 'TallGrass':
        return {
          type: 'TallGrass', x, y, width, height,
          monsters: JSON.parse(getProperty<string>(object, 'Monsters') || '[]'),
        };
    }
  }

  @OnEvent('udp:areas.*.trainers.*.moved')
  @ValidatedEvent(VALIDATION_PIPE)
  async onTrainerMoved(dto: MoveTrainerDto) {
    const trainerId = dto._id.toString();
    const oldLocation = this.trainerService.getLocation(trainerId)
      || await this.trainerService.find(dto._id)
      || notFound(dto._id);
    const otherTrainer = this.trainerService.getTrainerAt(dto.area, dto.x, dto.y);

    if (this.getDistance(dto, oldLocation) > 1 // Invalid movement
      || dto.area !== oldLocation.area // Mismatching area
      || otherTrainer && otherTrainer._id.toString() !== trainerId // Trainer already at location
      || !this.isWalkable(dto) // Tile not walkable
    ) {
      dto.area = oldLocation.area;
      dto.x = oldLocation.x;
      dto.y = oldLocation.y;
    }

    const gameObject = this.getGameObject(dto.area, dto.x, dto.y);
    switch (gameObject?.type) {
      case 'Portal':
        const {area, x, y} = gameObject.target;
        dto.area = area;
        dto.x = x;
        dto.y = y;
        // inform old area that the trainer left
        this.socketService.broadcast(`areas.${oldLocation.area}.trainers.${dto._id}.moved`, dto);
        // NB: this is required, because the GET /trainers?area= endpoint relies on
        //     the database knowing the trainer is in the new area.
        await this.trainerService.saveLocations([dto]);
        break;
      case 'TallGrass':
        if (this.isTallGrass(dto) && Math.random() < TALL_GRASS_ENCOUNTER_CHANCE) {
          const trainer = await this.trainerService.find(dto._id);
          const [type, minLevel, maxLevel] = gameObject.monsters.random();
          const level = maxLevel ? Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel : minLevel;
          trainer && await this.battleSetupService.createMonsterEncounter(trainer, type, level);
        }
        break;
    }

    this.checkAllNPCsOnSight(dto);

    this.socketService.broadcast(`areas.${dto.area}.trainers.${dto._id}.moved`, dto);
    this.trainerService.setLocation(trainerId, dto);
  }

  isWalkable(dto: MoveTrainerDto): boolean {
    const areaInfo = this.areas.get(dto.area);
    if (!areaInfo) {
      return false;
    }

    return !!areaInfo.walkable.get(dto.y * areaInfo.width + dto.x);
  }

  isTallGrass(dto: MoveTrainerDto): boolean {
    const areaInfo = this.areas.get(dto.area);
    if (!areaInfo) {
      return false;
    }

    return !!areaInfo.tallGrass.get(dto.y * areaInfo.width + dto.x);
  }

  getGameObject(area: string, x: number, y: number): GameObject | undefined {
    const areaInfo = this.areas.get(area);
    if (!areaInfo) {
      return;
    }

    for (const object of areaInfo.objects) {
      if (x >= object.x && x < object.x + object.width && y >= object.y && y < object.y + object.height) {
        return object;
      }
    }
    return;
  }

  async checkAllNPCsOnSight(dto: MoveTrainerDto) {
    const trainerId = dto._id.toString();
    const trainer = await this.trainerService.find(dto._id);
    if (!trainer || trainer.npc) {
      return;
    }

    const npcs = await this.trainerService.findAll({
      _id: {$ne: new Types.ObjectId(dto._id)},
      area: dto.area,
      'npc.encounterOnSight': true,
      'npc.encountered': {$ne: trainerId},
    });
    const attackers: Trainer[] = [];
    for (const npc of npcs) {
      if (this.checkNPConSight(dto, npc, 5)) {
        // FIXME Player blockieren
        // Finds the movement direction of the npc towards the player
        const x = npc.direction === Direction.LEFT ? -1 : npc.direction === Direction.RIGHT ? 1 : 0;
        const y = npc.direction === Direction.UP ? -1 : npc.direction === Direction.DOWN ? 1 : 0;

        // Finds how many steps the npc has to walk to the player
        const moveRange = this.getDistance(dto, npc) - 1;

        // Add path points for moving npc towards player
        const path: number[] = [];
        for (let i = 0; i <= moveRange; i++) {
          path.push(npc.x + i * x, npc.y + i * y);
        }
        await this.trainerService.update(npc._id, {
          'npc.path': path,
          $addToSet: {'npc.encountered': trainerId},
        });
        attackers.push(npc);
      }
    }

    if (attackers.length <= 0) {
      return;
    }

    await this.battleSetupService.createTrainerBattle(trainer, attackers);
  }

  getDistance(dto: MoveTrainerDto, npc: MoveTrainerDto) {
    return Math.abs(dto.x - npc.x) + Math.abs(dto.y - npc.y);
  }

  checkNPConSight(player: MoveTrainerDto, npc: Trainer, maxRange: number): boolean {
    if (npc._id.equals(player._id)) {
      return false;
    }

    switch (npc.direction) {
      case Direction.UP:
        return player.x === npc.x && player.y < npc.y && Math.abs(player.y - npc.y) <= maxRange;
      case Direction.DOWN:
        return player.x === npc.x && player.y > npc.y && Math.abs(player.y - npc.y) <= maxRange;
      case Direction.LEFT:
        return player.y === npc.y && player.x < npc.x && Math.abs(player.x - npc.x) <= maxRange;
      case Direction.RIGHT:
        return player.y === npc.y && player.x > npc.x && Math.abs(player.x - npc.x) <= maxRange;
    }
    return false;
  }
}
