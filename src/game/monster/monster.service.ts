import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';

import {EventService} from '../../event/event.service';
import {GlobalSchema} from '../../util/schema';
import {abilities as allAbilities, Ability, monsterTypes} from '../constants';
import {attackAtLevel, defenseAtLevel, healthAtLevel, speedAtLevel} from '../formulae';
import {CreateMonsterDto} from './monster.dto';
import {MAX_ABILITIES, Monster, MonsterDocument} from './monster.schema';

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
    const abilities = this.findBestAbilities(this.getPossibleAbilities(level, monsterType.type)).map(a => a.id);
    return {
      type,
      level,
      attributes: {
        health: healthAtLevel(level),
        attack: attackAtLevel(level),
        defense: defenseAtLevel(level),
        speed: speedAtLevel(level),
      },
      abilities,
    };
  }

  getPossibleAbilities(level: number, types: string[]) {
    // filter by minLevel and type (normal or one of monster types)
    return allAbilities.filter(a => level >= a.minLevel && (a.type === 'normal' || types.includes(a.type)));
  }

  findBestAbilities(abilities: Ability[]) {
    return abilities
      // bring some randomness
      .shuffle()
      // sort by minLevel descending - we want the best abilities
      .sort((a, b) => b.minLevel - a.minLevel)
      // take the best
      .slice(0, MAX_ABILITIES);
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

  async delete(id: string): Promise<MonsterDocument | null> {
    const deleted = await this.model.findByIdAndDelete(id).exec();
    deleted && this.emit('deleted', deleted);
    return deleted;
  }

  async healAll(filter: FilterQuery<Monster>): Promise<void> {
    const monsters = await this.findAll(filter);
    for (const monster of monsters) {
      monster.currentAttributes = monster.attributes;
    }
    await this.saveMany(monsters);
  }

  async deleteTrainer(trainer: string): Promise<Monster[]> {
    const monsters = await this.model.find({trainer}).exec();
    for (const monster of monsters) {
      this.emit('deleted', monster);
    }
    await this.model.deleteMany({trainer}).exec();
    return monsters;
  }

  async saveMany(monsters: MonsterDocument[]) {
    const newDocs = monsters.filter(o => o.isNew);
    const modDocs = monsters.filter(o => o.isModified());
    await this.model.bulkSave(monsters);
    newDocs.forEach(o => this.emit('created', o));
    modDocs.forEach(o => this.emit('updated', o));
  }

  private emit(event: string, monster: Monster): void {
    this.eventEmitter.emit(`trainers.${monster.trainer}.monsters.${monster._id}.${event}`, monster);
  }
}
