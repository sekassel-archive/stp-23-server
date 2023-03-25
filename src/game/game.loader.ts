import {Injectable, OnModuleInit} from '@nestjs/common';
import {Types} from 'mongoose';
import * as fs from 'node:fs/promises';
import {Region} from '../region/region.schema';
import {RegionService} from '../region/region.service';
import {AreaDocument} from './area/area.schema';
import {AreaService} from './area/area.service';
import {MonsterAttributes} from './monster/monster.schema';
import {MonsterService} from './monster/monster.service';
import {Direction} from './trainer/trainer.schema';
import {TrainerService} from './trainer/trainer.service';

export function getProperty<K extends string | number | boolean>(object: any, name: string): K | undefined {
  return object.properties?.find((p: any) => p.name === name)?.value as K;
}

@Injectable()
export class GameLoader implements OnModuleInit {
  constructor(
    private areaService: AreaService,
    private regionService: RegionService,
    private trainerService: TrainerService,
    private monsterService: MonsterService,
  ) {
  }


  async onModuleInit() {
    for (const regionName of await fs.readdir('./assets/maps/')) {
      if (regionName.startsWith('.') || regionName.endsWith('.json')) {
        continue;
      }

      const region = await this.regionService.findByNameOrCreate(regionName);
      const regionMeta = JSON.parse(await fs.readFile(`./assets/maps/${regionName}.json`, 'utf8').catch(() => '{}'));
      for (const areaFileName of await fs.readdir(`./assets/maps/${regionName}/`).catch(() => [])) {
        const area = await this.loadArea(areaFileName, region);
        if (regionMeta.spawn.area === area.name) {
          region.spawn = {
            area: area._id.toString(),
            x: regionMeta.spawn.x,
            y: regionMeta.spawn.y,
          };
        }
      }
      await region.save();
    }
  }

  private async loadArea(areaFileName: string, region: Region): Promise<AreaDocument> {
    const name = areaFileName.replace('.json', '');
    const map = JSON.parse(await fs.readFile(`./assets/maps/${region.name}/${areaFileName}`, 'utf8'));
    const area = await this.areaService.upsert({
      region: region._id.toString(),
      name,
    }, {
      region: region._id.toString(),
      name,
      map,
    });

    for (const layer of map.layers) {
      if (layer.type !== 'objectgroup') {
        continue;
      }
      for (const object of layer.objects) {
        if (!(object.point && object.class === 'Trainer')) {
          continue;
        }

        await this.loadTrainer(region, area, object, map);
      }
    }

    return area;
  }

  private async loadTrainer(region: Region, area: AreaDocument, object: any, map: any) {
    const trainer = await this.trainerService.upsert({
      region: region._id.toString(),
      area: area._id.toString(),
      name: object.name,
      npc: {$exists: true},
    }, {
      $setOnInsert: {
        user: new Types.ObjectId(),
      },
      region: region._id.toString(),
      area: area._id.toString(),
      name: object.name,
      image: getProperty<string>(object, 'Image') || 'Adam_16x16.png',
      coins: getProperty<number>(object, 'Coins') ?? Infinity,
      x: (object.x / map.tilewidth) | 0,
      y: (object.y / map.tileheight) | 0,
      direction: getProperty<number>(object, 'Direction') ?? Direction.DOWN,
      'npc.encountered': [], // TODO this should be in $setOnInsert above
      'npc.encounterOnSight': getProperty<boolean>(object, 'EncounterOnSight') || false,
      'npc.canHeal': getProperty<boolean>(object, 'CanHeal') || false,
      'npc.walkRandomly': getProperty<boolean>(object, 'WalkRandomly') || false,
      'npc.path': getProperty<string>(object, 'Path')?.split(/[,;]/g)?.map(s => +s) || null,
    });

    const monsterSpecs = JSON.parse(getProperty<string>(object, 'Monsters') || '[]');
    for (const monsterSpec of monsterSpecs) {
      const [type, level, abilities, [health, attack, defense, initiative]] = monsterSpec;
      const attributes: MonsterAttributes = {health, attack, defense, initiative};
      await this.monsterService.upsert({
        trainer: trainer._id.toString(),
        type,
      }, {
        level,
        experience: 0,
        abilities,
        attributes,
        currentAttributes: attributes,
      });
    }
  }
}
