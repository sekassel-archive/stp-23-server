import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {Area} from './area.schema';
import {MongooseRepository} from "@mean-stream/nestx";

@Injectable()
// @EventRepository - not necessary
export class AreaService extends MongooseRepository<Area> {
  constructor(
    @InjectModel(Area.name) model: Model<Area>,
  ) {
    super(model);
  }
}
