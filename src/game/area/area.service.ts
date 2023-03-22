import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, ProjectionFields, UpdateQuery} from 'mongoose';
import {Area, AreaDocument, CreateAreaDto} from './area.schema';

@Injectable()
export class AreaService {
  constructor(
    @InjectModel(Area.name) private model: Model<Area>,
  ) {
  }

  async findAll(filter: FilterQuery<Area> = {}, projection?: ProjectionFields<Area>): Promise<Area[]> {
    return this.model.find(filter, projection).sort({name: 1}).exec();
  }

  async findOne(id: string, projection?: ProjectionFields<Area>): Promise<Area | null> {
    return this.model.findById(id, projection).exec();
  }

  async create(dto: CreateAreaDto): Promise<Area> {
    return this.model.create(dto);
  }

  async upsert(filter: FilterQuery<Area>, update: UpdateQuery<Area>): Promise<AreaDocument> {
    return this.model.findOneAndUpdate(filter, update, {upsert: true, new: true}).exec();
  }
}
