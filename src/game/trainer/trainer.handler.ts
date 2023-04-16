import {Injectable, OnModuleInit} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Types} from 'mongoose';
import * as fs from 'node:fs/promises';
import {SocketService} from '../../udp/socket.service';
import {User} from '../../user/user.schema';
import {Area} from '../area/area.schema';
import {AreaService} from '../area/area.service';
import {TALL_GRASS_ENCOUNTER_CHANCE, TALL_GRASS_TRAINER} from '../constants';
import {EncounterService} from '../encounter/encounter.service';
import {getProperty} from '../game.loader';
import {MonsterService} from '../monster/monster.service';
import {OpponentDocument} from '../opponent/opponent.schema';
import {OpponentService} from '../opponent/opponent.service';
import {Layer} from '../tiled-map.interface';
import {Tile} from '../tileset.interface';
import {MoveTrainerDto, TalkTrainerDto} from './trainer.dto';
import {Direction, Trainer} from './trainer.schema';
import {TrainerService} from './trainer.service';

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
  monsters: [number, number][];
}

export type GameObject = Portal | TallGrass;

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
      const text = await fs.readFile(`./assets/maps/Test/${tsr.source}`, 'utf8').catch(() => '{}');
      const tileset = JSON.parse(text);
      for (const tile of tileset.tiles || []) {
        tiles[tsr.firstgid + tile.id] = tile;
      }
    }));

    return tiles;
  }

  @OnEvent('users.*.deleted')
  async onUserDeleted(user: User): Promise<void> {
    await this.trainerService.deleteUser(user._id.toString());
  }

  @OnEvent('udp:areas.*.trainers.*.moved')
  async onTrainerMoved(dto: MoveTrainerDto) {
    const trainerId = dto._id.toString();
    const oldLocation = this.trainerService.getLocation(trainerId)
      || await this.trainerService.findOne(trainerId);
    if (!oldLocation) {
      return;
    }
    const otherTrainer = this.trainerService.getTrainerAt(dto.area, dto.x, dto.y);

    if (this.getDistance(dto, oldLocation) > 1 // Invalid movement
      || otherTrainer && otherTrainer._id.toString() !== trainerId // Trainer already at location
      || !this.getTopTileProperty(dto, 'Walkable') // Tile not walkable
    ) {
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
        await this.trainerService.saveLocations([dto]);
        break;
      case 'TallGrass':
        if (this.getTopTileProperty(dto, 'TallGrass') && Math.random() < TALL_GRASS_ENCOUNTER_CHANCE) {
          const trainer = await this.trainerService.findOne(trainerId);
          const [type, level] = gameObject.monsters.random();
          trainer && await this.createMonsterEncounter(trainer.region, trainerId, type, level);
        }
        break;
    }

    this.checkAllNPCsOnSight(dto);

    this.socketService.broadcast(`areas.${dto.area}.trainers.${dto._id}.moved`, dto);
    this.trainerService.setLocation(trainerId, dto);
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

  getTopTileProperty(dto: MoveTrainerDto, property: string): boolean {
    const topTile = this.getTopTile(dto);
    if (topTile === 0) return false;
    const tile = this.tiles.get(dto.area)?.[topTile];
    return tile && getProperty<boolean>(tile, property) || false;
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

    await this.createTrainerBattle(trainer.region, trainerId, false, attackers);
  }

  private async createTrainerBattle(region: string, defender: string, defenderIsNPC: boolean, attackers: string[]) {
    const monsters = await this.monsterService.findAll({
      trainer: {$in: [defender, ...attackers]},
      'currentAttributes.health': {$gt: 0},
    });
    const defenderMonster = monsters.find(m => m.trainer === defender)?._id?.toString(); // FIXME monster order
    if (!defenderMonster) {
      return;
    }

    if (!monsters.some(m => m.trainer !== defender)) {
      // the attackers have no monsters left
      return;
    }

    const encounter = await this.encounterService.create(region, {isWild: false});
    await this.opponentService.create(encounter._id.toString(), defender, {
      isAttacker: false,
      isNPC: defenderIsNPC,
      monster: defenderMonster,
    });

    await Promise.all(attackers.map(attacker => {
      const monster = monsters.find(m => m.trainer === attacker)?._id?.toString();
      monster && this.opponentService.create(encounter._id.toString(), attacker, {
        isAttacker: true,
        isNPC: !defenderIsNPC,
        monster,
      });
    }));
  }

  private async createMonsterEncounter(region: string, defender: string, type: number, level: number) {
    const defenderMonster = (await this.monsterService.findAll({
      trainer: defender,
      'currentAttributes.health': {$gt: 0},
    }))[0]?._id?.toString(); // FIXME monster order
    if (!defenderMonster) {
      return;
    }

    const encounter = await this.encounterService.create(region, {isWild: true});
    await this.opponentService.create(encounter._id.toString(), defender, {
      isAttacker: false,
      isNPC: false,
      monster: defenderMonster,
    });
    const wildMonster = await this.monsterService.create(TALL_GRASS_TRAINER, this.monsterService.autofill(type, level));
    await this.opponentService.create(encounter._id.toString(), TALL_GRASS_TRAINER, {
      isAttacker: true,
      isNPC: true,
      monster: wildMonster._id.toString(),
    });
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

  @OnEvent('udp:areas.*.trainers.*.talked')
  async onTrainerTalked(dto: TalkTrainerDto) {
    const trainerId = dto._id.toString();
    const targetId = dto.target;
    const [trainer, target] = await Promise.all([
      this.trainerService.findOne(trainerId),
      this.trainerService.findOne(targetId),
    ]);
    if (!trainer || !target || trainer.area !== target.area || this.getDistance(trainer, target) > 2 || !target.npc) {
      return;
    }

    if (target.npc.canHeal) {
      await this.monsterService.healAll(trainerId);
    }
    if (target.npc.starters && dto.selection != null && !target.npc.encountered?.includes(trainerId)) {
      const starterId = target.npc.starters[dto.selection];
      if (starterId) {
        await this.trainerService.update(targetId, {
          $addToSet: {'npc.encountered': trainerId},
        });
        await this.monsterService.createAuto(trainerId, starterId, 1);
        await this.trainerService.update(trainerId, {
          $addToSet: {
            encounteredMonsterTypes: starterId,
          },
        });
      }
    }
    if (target.npc.encounterOnSight) {
      await this.trainerService.update(targetId, {
        $addToSet: {'npc.encountered': trainerId},
      });
      await this.createTrainerBattle(trainer.region, targetId, true, [trainerId]);
    }
  }

  @OnEvent('encounters.*.opponents.*.created')
  @OnEvent('encounters.*.opponents.*.updated')
  async onOpponent(opponent: OpponentDocument) {
    const monster = await this.monsterService.findOne(opponent.monster);
    if (!monster) {
      return;
    }

    const otherOpponents = await this.opponentService.findAll({
      encounter: opponent.encounter,
      $id: {$ne: opponent._id},
    });
    const otherTrainers = await this.trainerService.findAll({_id: {$in: otherOpponents.map(o => new Types.ObjectId(o.trainer))}});

    for (const trainer of otherTrainers) {
      await this.trainerService.update(trainer._id.toString(), {
        $addToSet: {
          encounteredMonsterTypes: monster.type,
        },
      });
    }
  }
}
