import {Injectable, OnModuleInit} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';
import {Region} from '../../region/region.schema';
import {RegionService} from '../../region/region.service';
import {Area, CreateAreaDto} from './area.schema';
import * as fs from 'node:fs/promises';

@Injectable()
export class AreaService implements OnModuleInit {
  constructor(
    @InjectModel(Area.name) private model: Model<Area>,
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
    const area = await this.findAll({region: region._id, name});
    if (area.length > 0) {
      return;
    }
    const map = await fs.readFile(`./assets/maps/${region.name}/${areaFileName}`, 'utf8');
    await this.create({
      region: region._id.toString(),
      name,
      map: JSON.parse(map),
    });
  }

  async findAll(filter: FilterQuery<Area> = {}): Promise<Area[]> {
    return this.model.find(filter).sort({name: 1}).exec();
  }

  async findOne(id: string): Promise<Area | null> {
    return this.model.findById(id).exec();
  }

  async create(dto: CreateAreaDto): Promise<Area> {
    return this.model.create(dto);
  }
}
