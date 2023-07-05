import {Injectable, Logger, OnModuleInit} from '@nestjs/common';
import {Types} from 'mongoose';
import * as fs from 'node:fs/promises';
import {environment} from '../../environment';
import {Region, Spawn} from '../../region/region.schema';
import {RegionService} from '../../region/region.service';
import {AreaDocument} from '../area/area.schema';
import {AreaService} from '../area/area.service';
import {MonsterService} from '../monster/monster.service';
import {getProperty, TiledMap, TiledObject} from '../tiled-map.interface';
import {Direction, Path} from '../trainer/trainer.schema';
import {TrainerService} from '../trainer/trainer.service';
import {MonsterGeneratorService} from './monster-generator/monster-generator.service';

@Injectable()
export class GameLoader implements OnModuleInit {
  private logger = new Logger(GameLoader.name, {timestamp: true});

  constructor(
    private areaService: AreaService,
    private regionService: RegionService,
    private trainerService: TrainerService,
    private monsterService: MonsterService,
    private monsterGeneratorService: MonsterGeneratorService,
  ) {
  }


  async onModuleInit() {
    if (environment.passive) {
      return;
    }

    for (const regionName of await fs.readdir('./assets/maps/')) {
      if (regionName.startsWith('.') || regionName.endsWith('.json')) {
        continue;
      }

      this.logger.log(`Loading ${regionName} region`);
      const map = JSON.parse(await fs.readFile(`./assets/maps/${regionName}.json`, 'utf8').catch(() => '{}'));
      const region = await this.regionService.upsert({name: regionName}, {name: regionName, map});

      const spawn = JSON.parse(getProperty<string>(region.map, 'Spawn') || '{}');

      for (const areaFileName of await fs.readdir(`./assets/maps/${regionName}/`).catch(() => [])) {
        const area = await this.loadArea(areaFileName, region);
        if (spawn.area === area.name) {
          region.spawn = {
            area: area._id.toString(),
            x: spawn.x,
            y: spawn.y,
          };
        }
      }
      await region.save();
    }
    this.logger.log('Game loaded');
  }

  private async loadArea(areaFileName: string, region: Region): Promise<AreaDocument> {
    const name = areaFileName.replace('.json', '');
    const map: TiledMap = JSON.parse(await fs.readFile(`./assets/maps/${region.name}/${areaFileName}`, 'utf8'));
    const spawn = getProperty<string>(map, 'Spawn');
    const area = await this.areaService.upsert({
      region: region._id.toString(),
      name,
    }, {
      region: region._id.toString(),
      name,
      map,
      spawn: spawn ? JSON.parse(spawn) : undefined,
    });

    for (const layer of map.layers) {
      if (layer.type !== 'objectgroup') {
        continue;
      }
      for (const object of layer.objects) {
        if (!(object.point && object.type === 'Trainer')) {
          continue;
        }

        await this.loadTrainer(region, area, object, map);
      }
    }

    return area;
  }

  private async loadTrainer(region: Region, area: AreaDocument, object: TiledObject, map: TiledMap) {
    const starters = getProperty<string>(object, 'Starters');
    const monsterSpecs = JSON.parse(getProperty<string>(object, 'Monsters') || '[]');
    const sells = getProperty<string>(object, 'Sells');

    const trainer = await this.trainerService.upsert({
      region: region._id.toString(),
      area: area._id.toString(),
      name: object.name,
      npc: {$exists: true},
    }, {
      $setOnInsert: {
        user: new Types.ObjectId(),
        team: [],
        'npc.encountered': [],
      },
      region: region._id.toString(),
      area: area._id.toString(),
      name: object.name,
      image: getProperty<string>(object, 'Image') || 'Adam_16x16.png',
      coins: getProperty<number>(object, 'Coins') ?? Infinity,
      x: (object.x / map.tilewidth) | 0,
      y: (object.y / map.tileheight) | 0,
      direction: getProperty<number>(object, 'Direction') ?? Direction.DOWN,
      'npc.encounterOnSight': getProperty<boolean>(object, 'EncounterOnSight') || false,
      'npc.encounterOnTalk': monsterSpecs?.length > 0,
      'npc.canHeal': getProperty<boolean>(object, 'CanHeal') || false,
      'npc.sells': sells ? JSON.parse(sells) : undefined,
      'npc.walkRandomly': getProperty<boolean>(object, 'WalkRandomly') || false,
      'npc.path': this.getPath(object, area),
      'npc.starters': starters ? JSON.parse(starters) : undefined,
    });

    trainer.team = [];
    for (const [type, level] of monsterSpecs) {
      const monster = await this.monsterGeneratorService.createAuto(trainer._id.toString(), type, level);
      trainer.team.push(monster._id.toString());
    }
    await trainer.save();
  }

  private getPath(object: TiledObject, area: AreaDocument) {
    const path = getProperty<string>(object, 'Path');
    if (!path) {
      return null;
    }

    const parsedPath = this.parsePath(path, area.map);
    if (!parsedPath) {
      return null;
    }

    try {
      return this.interpolatePath(parsedPath);
    } catch (e: any) {
      this.logger.warn(`Invalid path in area ${area.name} object ${object.id}: ${e.message}`);
      return null;
    }
  }

  private parsePath(path: string | number | undefined | boolean, map: TiledMap): Path | null{
    switch (typeof path) {
      case 'string':
        if (path.startsWith('[')) {
          return this.convertPath(JSON.parse(path));
        } else {
          return this.convertPath(path.split(/[,;]/g).map(s => +s));
        }
      case 'number': // path is an polygon object reference
        for (const layer of map.layers) {
          if (layer.type !== 'objectgroup') {
            continue;
          }

          for (const obj of layer.objects) {
            if (obj.id === path && obj.polygon) {
              const path = obj.polygon.map(({x, y}) => ([
                ((obj.x + x) / map.tilewidth) | 0,
                ((obj.y + y) / map.tileheight) | 0,
              ] as Path[number]));
              path.push(path[0]); // close path loop
              return path;
            }
          }
        }
        break;
    }
    return null;
  }

  private convertPath(path: number[] | Path): Path {
    if (Array.isArray(path[0])) {
      return path as Path;
    }
    return (path as number[]).reduce((acc, v, i, path) => {
      if (i % 2 === 0) {
        acc.push([v, path[i + 1]]);
      }
      return acc;
    }, [] as Path);
  }

  private interpolatePath(path: Path): Path {
    const newPath: Path = [];
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, y1] = path[i];
      const [x2, y2] = path[i + 1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      if (dx === 0 && dy === 0) {
        // direction might be changed, otherwise it's a duplicate
        if (path[i][2]) {
          newPath.push(path[i]);
        }
      } else if (dx === 0) {
        const dy1 = dy > 0 ? 1 : -1;
        for (let y = y1; y !== y2; y += dy1) {
          newPath.push([x1, y]);
        }
      } else if (dy === 0) {
        const dx1 = dx > 0 ? 1 : -1;
        for (let x = x1; x !== x2; x += dx1) {
          newPath.push([x, y1]);
        }
      } else {
        throw new Error('Diagonal paths are not supported');
      }
    }
    newPath.push(path[path.length - 1]);
    return newPath;
  }
}
