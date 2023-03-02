import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';
import {Opponent, OpponentDocument} from './opponent.schema';

@Injectable()
export class OpponentService {
  constructor(
    @InjectModel(Opponent.name) private model: Model<Opponent>,
  ) {
  }

  async findAll(region: string, encounter: string): Promise<OpponentDocument[]> {
    return this.model.find({region, encounter}).exec();
  }

  async findOne(id: string): Promise<OpponentDocument | null> {
    return this.model.findById(id).exec();
  }

  async deleteAll(filter: FilterQuery<OpponentService>) {
    await this.model.deleteMany(filter).exec();
  }
}
