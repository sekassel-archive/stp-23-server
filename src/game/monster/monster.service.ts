import {ForbiddenException, Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';

import {EventService} from '../../event/event.service';
import {abilitiesById, Effect, MonsterStatus, StatusEffect, StatusResult} from '../constants';
import {CreateMonsterDto} from './monster.dto';
import {Monster, MonsterAttributes, MonsterDocument} from './monster.schema';
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
        const ability = abilitiesById[abilityId];
        ability && (monster.abilities[abilityId] = ability.maxUses);
      }
      monster.markModified('abilities');
    }
    await this.saveAll(monsters);
  }

  applyEffects(monster: MonsterDocument, effects: Effect[]): boolean {
    const m = monster.currentAttributes;
    let hadEffect = false;
    for (const effect of effects) {
      if ('attribute' in effect) {
        const attribute = effect.attribute as keyof MonsterAttributes;
        if (m[attribute] !== monster.attributes[attribute]) {
          m[attribute] = Math.min(m[attribute] + effect.amount, monster.attributes[attribute]);
          hadEffect = true;
        }
        monster.markModified('currentAttributes');
      } else if ('status' in effect) {
        if (this.applyStatusEffect(effect, monster) !== 'unchanged') {
          hadEffect = true;
        }
      }
    }
    return hadEffect;
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
