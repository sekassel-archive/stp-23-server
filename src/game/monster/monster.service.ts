import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';

import {EventService} from '../../event/event.service';
import {UpdateMonsterDto} from './monster.dto';
import {Monster} from './monster.schema';

@Injectable()
export class MonsterService {
  constructor(
    @InjectModel(Monster.name) private model: Model<Monster>,
    private eventEmitter: EventService,
  ) {
  }

  async findAll(region: string, trainer: string, filter?: FilterQuery<Monster>): Promise<Monster[]> {
    return this.model.find({...filter, region, trainer}).exec();
  }

  async findOne(id: string): Promise<Monster | null> {
    return this.model.findById(id).exec();
  }

  async update(id: string, dto: UpdateMonsterDto): Promise<Monster | null> {
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
    this.eventEmitter.emit(`monsters.${monster._id}.${event}`, monster);
  }
}
