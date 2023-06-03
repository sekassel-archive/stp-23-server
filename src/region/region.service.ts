import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {Region} from './region.schema';
import {MongooseRepository} from "@mean-stream/nestx";

@Injectable()
export class RegionService extends MongooseRepository<Region> {
  constructor(
    @InjectModel(Region.name) model: Model<Region>,
  ) {
    super(model);
  }
}
