import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';

import {EventService} from '../../event/event.service';
import {Member} from '../../member/member.schema';
import {UpdateTrainerDto} from './trainer.dto';
import {Trainer} from './trainer.schema';

@Injectable()
export class TrainerService {
  constructor(
    @InjectModel(Trainer.name) private model: Model<Trainer>,
    private eventEmitter: EventService,
  ) {
  }

  async createFromMember(member: Member): Promise<Trainer> {
    const created = await this.model.create({
      region: member.region,
      user: member.user,
      area: '', // TODO find spawn area
      coins: 0,
      x: 0,
      y: 0,
    });
    if (created) {
      this.emit('created', created);
    }
    return created;
  }

  async upsert(filter: FilterQuery<Trainer>, update: UpdateQuery<Trainer>): Promise<Trainer> {
    return this.model.findOneAndUpdate(filter, update, {upsert: true, new: true}).exec();
  }

  async findAll(region: string, filter?: FilterQuery<Trainer>): Promise<Trainer[]> {
    return this.model.find({...filter, region}).exec();
  }

  async findOne(id: string): Promise<Trainer | null> {
    return this.model.findById(id).exec();
  }

  async update(id: string, dto: UpdateTrainerDto): Promise<Trainer | null> {
    const updated = await this.model.findByIdAndUpdate(id, dto, {new: true}).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteUser(user: string): Promise<Trainer[]> {
    const trainers = await this.model.find({user}).exec();
    for (const trainer of trainers) {
      this.emit('deleted', trainer);
    }
    await this.model.deleteMany({user}).exec();
    return trainers;
  }

  private emit(event: string, trainer: Trainer): void {
    this.eventEmitter.emit(`regions.${trainer.region}.trainers.${trainer._id}.${event}`, trainer);
  }
}
