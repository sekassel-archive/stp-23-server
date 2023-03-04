import {Injectable, OnModuleInit} from '@nestjs/common';
import {Types} from 'mongoose';
import * as fs from 'node:fs/promises';
import {Region} from '../region/region.schema';
import {RegionService} from '../region/region.service';
import {AreaService} from './area/area.service';
import {Direction} from './trainer/trainer.schema';
import {TrainerService} from './trainer/trainer.service';

@Injectable()
export class GameLoader implements OnModuleInit {
  constructor(
    private areaService: AreaService,
    private regionService: RegionService,
    private trainerService: TrainerService,
  ) {
  }


  async onModuleInit() {
    for (const regionName of await fs.readdir('./assets/maps/')) {
      const region = await this.regionService.findByNameOrCreate(regionName);
      for (const areaFileName of await fs.readdir(`./assets/maps/${regionName}/`)) {
        this.loadArea(areaFileName, region);
      }
    }
  }

  private async loadArea(areaFileName: string, region: Region) {
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

        await this.trainerService.upsert({
          region: region._id.toString(),
          area: area._id.toString(),
          name: object.name,
        }, {
          $setOnInsert: {
            user: new Types.ObjectId(),
          },
          region: region._id.toString(),
          area: area._id.toString(),
          name: object.name,
          image: object.properties.find((p: any) => p.name === 'Image')?.value || 'Adam_16x16.png',
          x: (object.x / map.tilewidth) | 0,
          y: (object.y / map.tileheight) | 0,
          direction: object.properties.find((p: any) => p.name === 'Direction')?.value || Direction.DOWN,
        });
      }
    }
  }
}
