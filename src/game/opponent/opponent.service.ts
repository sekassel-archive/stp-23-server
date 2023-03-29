import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';
import {EventService} from '../../event/event.service';
import {MonsterService} from '../monster/monster.service';
import {UpdateOpponentDto} from './opponent.dto';
import {ChangeMonsterMove, Opponent, OpponentDocument} from './opponent.schema';

@Injectable()
export class OpponentService {
  constructor(
    @InjectModel(Opponent.name) private model: Model<Opponent>,
    private monsterService: MonsterService,
    private eventService: EventService,
  ) {
  }

  async findAll(filter: FilterQuery<Opponent>): Promise<OpponentDocument[]> {
    return this.model.find(filter).exec();
  }

  async findOne(encounter: string, trainer: string): Promise<OpponentDocument | null> {
    return this.model.findOne({encounter, trainer}).exec();
  }

  async create(encounter: string, trainer: string, isAttacker: boolean, monster?: string): Promise<OpponentDocument> {
    try {
      const created = await this.model.create({
        encounter,
        trainer,
        monster: monster || (await this.monsterService.findAll({trainer}))[0]?._id?.toString(),
        isAttacker,
      });
      created && this.emit('created', created);
      return created;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException(`Opponent ${trainer} already exists in encounter ${encounter}`);
      }
      throw err;
    }
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
    this.eventService.emit(`encounters.${opponent.encounter}.opponents.${opponent.trainer}.${event}`, opponent);
  }
}
