import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';

import {EventService} from '../../event/event.service';
import {CreateMonsterDto} from './monster.dto';
import {Monster} from './monster.schema';
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
    });
  }

  emit(event: string, monster: Monster): void {
    this.eventEmitter.emit(`trainers.${monster.trainer}.monsters.${monster._id}.${event}`, monster);
  }
}
