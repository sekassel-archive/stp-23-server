import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';

import {EventService} from '../../event/event.service';
import {GlobalSchema} from '../../util/schema';
import {abilities, Effect, monsterTypes} from '../constants';
import {CreateMonsterDto} from './monster.dto';
import {Monster, MonsterAttributes, MonsterDocument} from './monster.schema';

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

  async createAuto(trainer: string, type: number, level: number) {
    const monsterType = monsterTypes.find(t => t.id === type);
    if (!monsterType) {
      throw new NotFoundException('Invalid monster type');
    }
    return this.create(trainer, {
      type,
      level,
      attributes: {
        health: 7 + Math.round(level * 2.8),
        attack: 5 + Math.round(level * 2.5),
        defense: 5 + Math.round(level * 2.5),
        initiative: 5 + Math.round(level * 2.2),
      },
      abilities: abilities.filter(a => monsterType.type.includes(a.type) && a.minLevel >= level).map(a => a.id).slice(0, 4),
    });
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

  async upsert(filter: FilterQuery<Monster>, update: UpdateQuery<Monster>) {
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

  async healAll(trainer: string): Promise<void> {
    const monsters = await this.findAll({trainer});
    for (const monster of monsters) {
      monster.currentAttributes = monster.attributes;
      this.emit('updated', monster);
    }
    await this.model.bulkSave(monsters);
  }

  async healOne(trainerId: string, monsterId: string, effects: Effect[]): Promise<Monster> {
    const monster = await this.findOne(monsterId);
    if (monster) {
      const m = monster.currentAttributes;
      for (const effect of effects) {
        const attribute = effect.attribute as keyof MonsterAttributes;
        m[attribute] = Math.min(m[attribute] + effect.amount, monster.attributes[attribute]);
      }
      monster.markModified('currentAttributes');
      await monster.save();
      this.emit('updated', monster);
      return monster;
    } else {
      throw new NotFoundException('Provided monsterId not found on trainer');
    }
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
