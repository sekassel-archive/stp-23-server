import {Injectable, OnModuleInit} from '@nestjs/common';
import {Types} from 'mongoose';
import * as fs from 'node:fs/promises';
import {environment} from '../../environment';
import {Region} from '../../region/region.schema';
import {RegionService} from '../../region/region.service';
import {AreaDocument} from '../area/area.schema';
import {AreaService} from '../area/area.service';
import {getProperty, TiledMap} from '../tiled-map.interface';
import {Direction} from '../trainer/trainer.schema';
import {TrainerService} from '../trainer/trainer.service';

@Injectable()
export class GameLoader implements OnModuleInit {
  constructor(
    private areaService: AreaService,
    private regionService: RegionService,
    private trainerService: TrainerService,
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

      const region = await this.regionService.findByNameOrCreate(regionName);
      region.map = JSON.parse(await fs.readFile(`./assets/maps/${regionName}.json`, 'utf8').catch(() => '{}'));

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
  }

  private async loadArea(areaFileName: string, region: Region): Promise<AreaDocument> {
    const name = areaFileName.replace('.json', '');
    const map: TiledMap = JSON.parse(await fs.readFile(`./assets/maps/${region.name}/${areaFileName}`, 'utf8'));
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
        if (!(object.point && object.type === 'Trainer')) {
          continue;
        }

        await this.trainerService.upsert({
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
          npc: {
            walkRandomly: getProperty<boolean>(object, 'WalkRandomly') || false,
            path: getProperty<string>(object, 'Path')?.split(/[,;]/g)?.map(s => +s),
          },
        });
      }
    }

    return area;
  }
}
