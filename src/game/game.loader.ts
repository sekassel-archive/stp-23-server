import {Injectable, OnModuleInit} from '@nestjs/common';
import fs from 'node:fs/promises';
import {Region} from '../region/region.schema';
import {RegionService} from '../region/region.service';
import {AreaService} from './area/area.service';

@Injectable()
export class GameLoader implements OnModuleInit {
  constructor(
    private areaService: AreaService,
    private regionService: RegionService,
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
    const map = await fs.readFile(`./assets/maps/${region.name}/${areaFileName}`, 'utf8');
    await this.areaService.upsert({
      region: region._id.toString(),
      name,
    }, {
      region: region._id.toString(),
      name,
      map: JSON.parse(map),
    });
  }
}
