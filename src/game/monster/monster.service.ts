import {ForbiddenException, Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';

import {EventService} from '../../event/event.service';
import {abilities, Effect, StatusEffect, StatusResult} from '../constants';
import {CreateMonsterDto} from './monster.dto';
import {Monster, MonsterAttributes, MonsterDocument, MonsterStatus} from './monster.schema';
import {EventRepository, MongooseRepository} from "@mean-stream/nestx";

@Injectable()
@EventRepository()
export class MonsterService extends MongooseRepository<Monster> {
  constructor(
    @InjectModel(Monster.name) model: Model<Monster>,
    private eventEmitter: EventService,
  ) {
    super(model);
  }

  async createSimple(trainer: string, dto: CreateMonsterDto): Promise<Monster> {
    return this.create({
      ...dto,
      trainer,
      experience: 0,
      currentAttributes: dto.attributes,
      status: [],
    });
  }

  async healAll(filter: FilterQuery<Monster>): Promise<void> {
    const monsters = await this.findAll(filter);
    for (const monster of monsters) {
      monster.status = [];
      monster.currentAttributes = monster.attributes;
      for (const abilityId in monster.abilities) {
        const ability = abilities.find(a => a.id === +abilityId);
        ability && (monster.abilities[abilityId] = ability.maxUses);
      }
      monster.markModified('abilities');
    }
    await this.saveAll(monsters);
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

  applyStatusEffect(effect: StatusEffect, monster: MonsterDocument): StatusResult {
    const status = effect.status as MonsterStatus;
    if (effect.remove) {
      const index = monster.status.indexOf(status);
      if (index >= 0) {
        monster.status.splice(index, 1);
        monster.markModified('status');
        return 'removed';
      }
    } else if (!monster.status.includes(status)) {
      monster.status.push(status);
      monster.markModified('status');
      return 'added';
    }
    return 'unchanged';
  }

  emit(event: string, monster: Monster): void {
    this.eventEmitter.emit(`trainers.${monster.trainer}.monsters.${monster._id}.${event}`, monster);
  }
}
