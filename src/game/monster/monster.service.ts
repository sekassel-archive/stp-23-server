import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';

import {EventService} from '../../event/event.service';
import {CreateMonsterDto} from './monster.dto';
import {Monster, MonsterDocument} from './monster.schema';
import {EventRepository, MongooseRepository} from "@mean-stream/nestx";
import {abilities} from "../constants";

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
    return super.create({
      ...dto,
      trainer,
      experience: 0,
      currentAttributes: dto.attributes,
    });
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

  async saveMany(monsters: MonsterDocument[]) {
    const newDocs = monsters.filter(o => o.isNew);
    const modDocs = monsters.filter(o => o.isModified());
    await this.model.bulkSave(monsters);
    newDocs.forEach(o => this.emit('created', o));
    modDocs.forEach(o => this.emit('updated', o));
  }

  emit(event: string, monster: Monster): void {
    this.eventEmitter.emit(`trainers.${monster.trainer}.monsters.${monster._id}.${event}`, monster);
  }
}
