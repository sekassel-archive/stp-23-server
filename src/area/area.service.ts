import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';
import {Area} from './area.schema';

@Injectable()
export class AreaService {
  constructor(
    @InjectModel(Area.name) private model: Model<Area>,
  ) {
  }

  async findAll(filter: FilterQuery<Area> = {}): Promise<Area[]> {
    return this.model.find(filter).sort({name: 1}).exec();
  }

  async findOne(id: string): Promise<Area | null> {
    return this.model.findById(id).exec();
  }
}
