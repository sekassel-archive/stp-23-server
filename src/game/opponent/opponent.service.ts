import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';
import {UpdateOpponentDto} from './opponent.dto';
import {ChangeMonsterMove, Opponent, OpponentDocument} from './opponent.schema';

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

  async updateOne(id: string, dto: UpdateOpponentDto | UpdateQuery<Opponent>): Promise<OpponentDocument | null> {
    if (dto.move && dto.move.type === ChangeMonsterMove.type) {
      // Changing the monster happens immediately
      // TODO: validate that the monster is alive
      dto = {
        ...dto,
        monster: dto.move.monster,
      };
    }
    const updated = await this.model.findByIdAndUpdate(id, dto, {new: true}).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteAll(filter: FilterQuery<OpponentService>) {
    await this.model.deleteMany(filter).exec();
  }

  emit(event: string, opponent: Opponent) {
    this.model.emit(`encounters.${opponent.encounter}.opponents.${opponent._id}.${event}`, opponent);
  }
}
