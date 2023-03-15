import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';
import {MonsterService} from '../monster/monster.service';
import {UpdateOpponentDto} from './opponent.dto';
import {ChangeMonsterMove, Opponent, OpponentDocument} from './opponent.schema';

@Injectable()
export class OpponentService {
  constructor(
    @InjectModel(Opponent.name) private model: Model<Opponent>,
    private monsterService: MonsterService,
  ) {
  }

  async findAll(filter: FilterQuery<Opponent>): Promise<OpponentDocument[]> {
    return this.model.find(filter).exec();
  }

  async findOne(encounter: string, trainer: string): Promise<OpponentDocument | null> {
    return this.model.findOne({encounter, trainer}).exec();
  }

  async create(encounter: string, trainer: string): Promise<OpponentDocument> {
    const created = await this.model.create({
      encounter,
      trainer,
      monster: await this.monsterService.findAll({trainer}).then(monsters => monsters[0]._id.toString()),
    });
    created && this.emit('created', created);
    return created;
  }

  async updateOne(encounter: string, trainer: string, dto: UpdateOpponentDto | UpdateQuery<Opponent>): Promise<OpponentDocument | null> {
    if (dto.move && dto.move.type === ChangeMonsterMove.type) {
      // Changing the monster happens immediately
      const monster = await this.monsterService.findOne(dto.move.monster);
      if (!monster) {
        throw new NotFoundException(`Monster ${dto.move.monster} not found`);
      }
      if (monster.attributes.health <= 0) {
        throw new ConflictException(`Monster ${dto.move.monster} is dead`);
      }
      dto = {
        ...dto,
        monster: dto.move.monster,
      };
    }
    const updated = await this.model.findOneAndUpdate({encounter, trainer}, dto, {new: true}).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteAll(filter: FilterQuery<OpponentService>) {
    await this.model.deleteMany(filter).exec();
  }

  emit(event: string, opponent: Opponent) {
    this.model.emit(`encounters.${opponent.encounter}.opponents.${opponent.trainer}.${event}`, opponent);
  }
}
