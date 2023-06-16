import {Injectable, OnModuleInit} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Types} from 'mongoose';
import * as fs from 'node:fs/promises';
import {SocketService} from '../../../udp/socket.service';
import {Area} from '../../area/area.schema';
import {AreaService} from '../../area/area.service';
import {TALL_GRASS_ENCOUNTER_CHANCE} from '../../constants';
import {getProperty, Layer} from '../../tiled-map.interface';
import {Tile} from '../../tileset.interface';
import {MoveTrainerDto} from '../../trainer/trainer.dto';
import {Direction, Trainer} from '../../trainer/trainer.schema';
import {TrainerService} from '../../trainer/trainer.service';
import {BattleSetupService} from '../battle-setup/battle-setup.service';
import {ValidatedEvent, VALIDATION_PIPE} from "../../../util/validated.decorator";
import {notFound} from "@mean-stream/nestx";

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
export class MovementService implements OnModuleInit {
  constructor(
    private trainerService: TrainerService,
    private socketService: SocketService,
    private areaService: AreaService,
    private battleSetupService: BattleSetupService,
  ) {
  }

  objects = new Map<string, GameObject[]>;
  tilelayers = new Map<string, Layer[]>;
  tiles = new Map<string, Tile[]>;

  async onModuleInit() {
    const areas = await this.areaService.findAll();
    for (const area of areas) {
      const portals = this.loadObjects(area, areas);
      this.objects.set(area._id.toString(), portals);

      this.tilelayers.set(area._id.toString(), area.map.layers);

      const tiles = await this.loadTiles(area);
      this.tiles.set(area._id.toString(), tiles);
    }
  }

  private loadObjects(area: Area, areas: Area[]) {
    const objects: GameObject[] = [];

    for (const layer of area.map.layers) {
      if (layer.type !== 'objectgroup') {
        continue;
      }
      for (const object of layer.objects) {
        const x = object.x / area.map.tilewidth;
        const y = object.y / area.map.tileheight;
        const width = object.width / area.map.tilewidth;
        const height = object.height / area.map.tileheight;
        switch (object.type) {
          case 'Portal':
            const targetName = getProperty(object, 'Map');
            const targetArea = areas.find(a => a.name === targetName && a.region === area.region);
            if (!targetArea) {
              console.log('Invalid portal target:', targetName, 'in area', area.name, 'object', object.id);
              continue;
            }
            objects.push({
              type: 'Portal', x, y, width, height,
              target: {
                area: targetArea._id.toString(),
                x: getProperty<number>(object, 'X') || 0,
                y: getProperty<number>(object, 'Y') || 0,
              },
            });
            break;
          case 'TallGrass':
            objects.push({
              type: 'TallGrass', x, y, width, height,
              monsters: JSON.parse(getProperty<string>(object, 'Monsters') || '[]'),
            });
            break;
        }
      }
    }
    return objects;
  }

  private async loadTiles(area: Area): Promise<Tile[]> {
    const tiles: Tile[] = [];

    await Promise.all(area.map.tilesets.map(async tsr => {
      const sourceFileName = tsr.source.substring(tsr.source.lastIndexOf('/') + 1);
      const text = await fs.readFile(`./assets/tilesets/${sourceFileName}`, 'utf8').catch(() => '{}');
      const tileset = JSON.parse(text);
      for (const tile of tileset.tiles || []) {
        tiles[tsr.firstgid + tile.id] = tile;
      }
    }));

    return tiles;
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

  getTiles({area, x, y}: MoveTrainerDto): number[] {
    const layers = this.tilelayers.get(area);
    if (!layers) {
      return [];
    }

    const tiles: number[] = [];
    for (let i = (layers.length || 0) - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.type !== 'tilelayer') {
        continue;
      }
      if (layer.data) {
        if (x >= layer.x && x < layer.x + layer.width && y >= layer.y && y < layer.y + layer.height) {
          const tile = layer.data[(y - layer.y) * layer.width + (x - layer.x)];
          if (tile != 0) {
            tiles.push(tile);
          }
        }
      } else if (layer.chunks) {
        for (const chunk of layer.chunks) {
          if (x >= chunk.x && x < chunk.x + chunk.width && y >= chunk.y && y < chunk.y + chunk.height) {
            const tile = chunk.data[(y - chunk.y) * chunk.width + (x - chunk.x)];
            if (tile != 0) {
              tiles.push(tile);
            }
          }
        }
      }
    }

    return tiles;
  }

  isWalkable(dto: MoveTrainerDto): boolean {
    const tileMap = this.tiles.get(dto.area);
    if (!tileMap) return false;

    const tileIds = this.getTiles(dto);
    if (!tileIds.length) return false;

    for (const tileId of tileIds) {
      const tile = tileMap[tileId];
      if (!tile || !getProperty<boolean>(tile, 'Walkable')) {
        return false;
      }
    }
    return true;
  }

  isTallGrass(dto: MoveTrainerDto): boolean {
    const tileMap = this.tiles.get(dto.area);
    if (!tileMap) return false;

    const tileIds = this.getTiles(dto);
    if (!tileIds.length) return false;

    for (const tileId of tileIds) {
      const tile = tileMap[tileId];
      if (tile && getProperty<boolean>(tile, 'TallGrass')) {
        return true;
      }
    }
    return false;
  }

  getGameObject(area: string, x: number, y: number) {
    const portals = this.objects.get(area) || [];
    for (const portal of portals) {
      if (x >= portal.x && x < portal.x + portal.width && y >= portal.y && y < portal.y + portal.height) {
        return portal;
      }
    }
    return null;
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
