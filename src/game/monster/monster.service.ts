import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';

import {EventService} from '../../event/event.service';
import {GlobalSchema} from '../../util/schema';
import {abilities, Effect, StatusEffect} from '../constants';
import {CreateMonsterDto} from './monster.dto';
import {Monster, MonsterAttributes, MonsterDocument, MonsterStatus} from './monster.schema';

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
      status: [],
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
      for (const abilityId in monster.abilities) {
        const ability = abilities.find(a => a.id === +abilityId);
        ability && (monster.abilities[abilityId] = ability.maxUses);
      }
      monster.markModified('abilities');
    }
    await this.saveMany(monsters);
  }

  async applyEffects(monster: MonsterDocument, effects: Effect[]) {
    const m = monster.currentAttributes;
    for (const effect of effects) {
      if ('attribute' in effect) {
        const attribute = effect.attribute as keyof MonsterAttributes;
        if (m[attribute] === monster.attributes[attribute]) {
          throw new ForbiddenException('Can\'t use item, attribute already at max');
        }
        m[attribute] = Math.min(m[attribute] + effect.amount, monster.attributes[attribute]);
      } else if ('status' in effect) {
        this.applyStatusEffect(effect, monster);
      }
    }
    monster.markModified('currentAttributes');
  }

  applyStatusEffect(effect: StatusEffect, monster: MonsterDocument) {
    const status = effect.status as MonsterStatus;
    if (effect.remove) {
      const index = monster.status.indexOf(status);
      if (index >= 0) {
        monster.status.splice(index, 1);
        monster.markModified('status');
      }
    } else if (!monster.status.includes(status)) {
      monster.status.push(status);
      monster.markModified('status');
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
