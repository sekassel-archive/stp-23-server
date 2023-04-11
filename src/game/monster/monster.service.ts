import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';

import {EventService} from '../../event/event.service';
import {GlobalSchema} from '../../util/schema';
import {abilities as allAbilities, monsterTypes} from '../constants';
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

  autofill(type: number, level: number): CreateMonsterDto {
    const monsterType = monsterTypes.find(t => t.id === type);
    if (!monsterType) {
      throw new NotFoundException('Invalid monster type');
    }
    const abilities = allAbilities
      // filter by minLevel and type (normal or one of monster types)
      .filter(a => level >= a.minLevel && (a.type === 'normal' || monsterType.type.includes(a.type)))
      // bring some randomness
      .shuffle()
      // sort by minLevel descending - we want the best abilities
      .sort((a, b) => b.minLevel - a.minLevel)
      // take the best 4
      .slice(0, 4)
      .map(a => a.id);
    return {
      type,
      level,
      attributes: {
        health: 7 + Math.round(level * 3),
        attack: 5 + Math.round(level * 2.5),
        defense: 5 + Math.round(level * 2.5),
        initiative: 3 + Math.round(level * 2),
      },
      abilities,
    };
  }

  async createAuto(trainer: string, type: number, level: number): Promise<MonsterDocument> {
    const dto = this.autofill(type, level);
    return this.upsert({
      trainer,
      // TODO this ensures that the same monster is not added twice,
      //      but maybe it should be possible to have multiple monsters of the same type
      type,
    }, {
      ...dto,
      trainer,
      experience: 0,
      currentAttributes: dto.attributes,
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

  async healAll(trainer: string): Promise<void> {
    const monsters = await this.findAll({trainer});
    for (const monster of monsters) {
      monster.currentAttributes = monster.attributes;
      this.emit('updated', monster);
    }
    await this.model.bulkSave(monsters);
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
