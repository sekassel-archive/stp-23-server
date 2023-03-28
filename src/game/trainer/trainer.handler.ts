import {Injectable, OnModuleInit} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Types} from 'mongoose';
import * as fs from 'node:fs/promises';
import {SocketService} from '../../udp/socket.service';
import {User} from '../../user/user.schema';
import {Area} from '../area/area.schema';
import {AreaService} from '../area/area.service';
import {EncounterService} from '../encounter/encounter.service';
import {getProperty} from '../game.loader';
import {MonsterService} from '../monster/monster.service';
import {OpponentService} from '../opponent/opponent.service';
import {Layer} from '../tiled-map.interface';
import {Tile} from '../tileset.interface';
import {MoveTrainerDto, TalkTrainerDto} from './trainer.dto';
import {Direction, Trainer} from './trainer.schema';
import {TrainerService} from './trainer.service';

interface Portal {
  x: number;
  y: number;
  width: number;
  height: number;
  target: {
    area: string;
    x: number;
    y: number;
  };
}

@Injectable()
export class TrainerHandler implements OnModuleInit {
  constructor(
    private trainerService: TrainerService,
    private socketService: SocketService,
    private areaService: AreaService,
    private encounterService: EncounterService,
    private opponentService: OpponentService,
    private monsterService: MonsterService,
  ) {
  }

  portals = new Map<string, Portal[]>;
  tilelayers = new Map<string, Layer[]>;
  tiles = new Map<string, Tile[]>;

  async onModuleInit() {
    const areas = await this.areaService.findAll();
    for (const area of areas) {
      const portals = this.loadPortals(area, areas);
      this.portals.set(area._id.toString(), portals);

      this.tilelayers.set(area._id.toString(), area.map.layers);

      const tiles = await this.loadTiles(area);
      this.tiles.set(area._id.toString(), tiles);
    }
  }

  private loadPortals(area: Area, areas: Area[]) {
    const portals: Portal[] = [];

    for (const layer of area.map.layers) {
      if (layer.type !== 'objectgroup') {
        continue;
      }
      for (const object of layer.objects) {
        if (object.type !== 'Portal') {
          continue;
        }

        const targetName = getProperty(object, 'Map');
        const targetArea = areas.find(a => a.name === targetName && a.region === area.region);
        if (!targetArea) {
          console.log('Invalid portal target:', targetName, 'in area', area.name, 'object', object.id);
          continue;
        }

        const portal: Portal = {
          x: object.x / area.map.tilewidth,
          y: object.y / area.map.tileheight,
          width: object.width / area.map.tilewidth,
          height: object.height / area.map.tileheight,
          target: {
            area: targetArea._id.toString(),
            x: getProperty<number>(object, 'X') || 0,
            y: getProperty<number>(object, 'Y') || 0,
          },
        };
        portals.push(portal);
      }
    }
    return portals;
  }

  private async loadTiles(area: Area): Promise<Tile[]> {
    const tiles: Tile[] = [];

    await Promise.all(area.map.tilesets.map(async tsr => {
      const text = await fs.readFile(`./assets/maps/Test/${tsr.source}`, 'utf8').catch(() => '{}');
      const tileset = JSON.parse(text);
      for (const tile of tileset.tiles) {
        tiles[tsr.firstgid + tile.id] = tile;
      }
    }));

    return tiles;
  }

  @OnEvent('users.*.deleted')
  async onUserDeleted(user: User): Promise<void> {
    await this.trainerService.deleteUser(user._id.toString());
  }

  @OnEvent('areas.*.trainers.*.moved')
  async onTrainerMoved(dto: MoveTrainerDto) {
    // TODO validate movement
    const oldLocation = this.trainerService.getLocation(dto._id.toString())
      || await this.trainerService.findOne(dto._id.toString());
    if (!oldLocation) {
      return;
    }
    const otherTrainer = this.trainerService.getTrainerAt(dto.area, dto.x, dto.y);

    if (this.getDistance(dto, oldLocation) > 1 // Invalid movement
      || otherTrainer && otherTrainer._id.toString() !== dto._id.toString() // Trainer already at location
      || !this.isWalkable(dto)
    ) {
      dto.x = oldLocation.x;
      dto.y = oldLocation.y;
    }

    const portal = this.getPortal(dto.area, dto.x, dto.y);
    if (portal) {
      const {area, x, y} = portal.target;
      dto.area = area;
      dto.x = x;
      dto.y = y;
      // inform old area that the trainer left
      this.socketService.broadcast(`areas.${oldLocation.area}.trainers.${dto._id}.moved`, dto);
      await this.trainerService.saveLocations([dto]);
    }

    this.checkAllNPCsOnSight(dto);

    this.socketService.broadcast(`areas.${dto.area}.trainers.${dto._id}.moved`, dto);
    this.trainerService.setLocation(dto._id.toString(), dto);
  }

  getTopTile({area, x, y}: MoveTrainerDto): number {
    const layers = this.tilelayers.get(area);
    if (!layers) {
      return 0;
    }

    for (let i = (layers.length || 0) - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.type !== 'tilelayer') {
        continue;
      }
      if (!(x >= layer.startx && x < layer.startx + layer.width && y >= layer.starty && y < layer.starty + layer.height)) {
        continue;
      }

      for (const chunk of layer.chunks) {
        if (x >= chunk.x && x < chunk.x + chunk.width && y >= chunk.y && y < chunk.y + chunk.height) {
          const tile = chunk.data[(y - chunk.y) * chunk.width + (x - chunk.x)];
          if (tile != 0) {
            return tile;
          }
        }
      }
    }

    return 0;
  }

  isWalkable(dto: MoveTrainerDto): boolean {
    const topTile = this.getTopTile(dto);
    if (topTile === 0) return false;
    const tile = this.tiles.get(dto.area)?.[topTile];
    return tile && getProperty<boolean>(tile, 'Walkable') || false;
  }

  getPortal(area: string, x: number, y: number) {
    const portals = this.portals.get(area) || [];
    for (const portal of portals) {
      if (x >= portal.x && x < portal.x + portal.width && y >= portal.y && y < portal.y + portal.height) {
        return portal;
      }
    }
    return null;
  }

  async checkAllNPCsOnSight(dto: MoveTrainerDto) {
    const trainerId = dto._id.toString();
    const trainer = await this.trainerService.findOne(trainerId);
    if (!trainer || trainer.npc) {
      return;
    }

    const npcs = await this.trainerService.findAll({
      _id: {$ne: new Types.ObjectId(dto._id)},
      area: dto.area,
      'npc.encounterOnSight': true,
      'npc.encountered': {$ne: trainerId},
    });
    const attackers: string[] = [];
    for (const npc of npcs) {
      if (this.checkNPConSight(dto, npc, 5)) {
        // TODO: Player blockieren
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
        await this.trainerService.update(npc._id.toString(), {
          'npc.path': path,
          $addToSet: {'npc.encountered': trainerId},
        });
        attackers.push(npc._id.toString());
      }
    }

    if (attackers.length <= 0) {
      return;
    }

    await this.createEncounter(trainer.region, trainerId, attackers);
  }

  private async createEncounter(region: string, defender: string, attackers: string[]) {
    const encounter = await this.encounterService.create(region);
    await this.opponentService.create(encounter._id.toString(), defender, false);
    await Promise.all(attackers.map(attacker => this.opponentService.create(encounter._id.toString(), attacker, true)));
  }

  private getDistance(dto: MoveTrainerDto, npc: MoveTrainerDto) {
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

  @OnEvent('areas.*.trainers.*.talked')
  async onTrainerTalked(dto: TalkTrainerDto) {
    const trainerId = dto._id.toString();
    const targetId = dto.target;
    const [trainer, target] = await Promise.all([
      this.trainerService.findOne(trainerId),
      this.trainerService.findOne(targetId),
    ]);
    if (!trainer || !target || trainer.area !== target.area || this.getDistance(trainer, target) > 2) {
      return;
    }

    if (target.npc?.canHeal) {
      await this.monsterService.healAll(trainerId);
    } else if (target.npc?.encounterOnSight) {
      await this.trainerService.update(targetId, {
        $addToSet: {'npc.encountered': trainerId},
      });
      await this.createEncounter(trainer.region, targetId, [trainerId]);
    }
  }
}
