import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';

import {EventService} from '../../event/event.service';
import {GlobalSchema} from '../../util/schema';
import {CreateMonsterDto} from './monster.dto';
import {Monster, MonsterDocument} from './monster.schema';

@Injectable()
export class MonsterService {
  constructor(
    @InjectModel(Monster.name) private model: Model<Monster>,
    private eventEmitter: EventService,
  ) {
  }

  async findAll(filter: FilterQuery<Monster>): Promise<MonsterDocument[]> {
    return this.model.find(filter).exec();
  }

  async findOne(id: string): Promise<MonsterDocument | null> {
    return this.model.findById(id).exec();
  }

  async create(trainer: string, dto: CreateMonsterDto): Promise<Monster> {
    const create: Omit<Monster, keyof GlobalSchema> = {
      ...dto,
      trainer,
      experience: 0,
      currentAttributes: dto.attributes,
    };
    const created = await this.model.create(create);
    this.emit('created', created);
    return created;
  }

  async upsert(filter: FilterQuery<Monster>, update: UpdateQuery<Monster>): Promise<MonsterDocument> {
    const result = await this.model.findOneAndUpdate(filter, update, {upsert: true, new: true, rawResult: true}).exec();
    if (!result.value) {
      throw new Error('Upsert failed');
    }
    const monster = result.value;
    this.emit(result.lastErrorObject?.updatedExisting ? 'updated' : 'created', monster);
    return monster;
  }

  async update(id: string, dto: UpdateQuery<Monster>): Promise<MonsterDocument | null> {
    const updated = await this.model.findByIdAndUpdate(id, dto, {new: true}).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteTrainer(trainer: string): Promise<Monster[]> {
    const monsters = await this.model.find({trainer}).exec();
    for (const monster of monsters) {
      this.emit('deleted', monster);
    }
    await this.model.deleteMany({trainer}).exec();
    return monsters;
  }

  private emit(event: string, monster: Monster): void {
    this.eventEmitter.emit(`trainers.${monster.trainer}.monsters.${monster._id}.${event}`, monster);
  }
}
