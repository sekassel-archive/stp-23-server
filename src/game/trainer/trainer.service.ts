import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';

import {EventService} from '../../event/event.service';
import {RegionService} from '../../region/region.service';
import {GlobalSchema} from '../../util/schema';
import {CreateTrainerDto, MOVE_TRAINER_PROPS, MoveTrainerDto, UpdateTrainerDto} from './trainer.dto';
import {Direction, Trainer, TrainerDocument} from './trainer.schema';

@Injectable()
export class TrainerService {
  constructor(
    @InjectModel(Trainer.name) private model: Model<Trainer>,
    private eventEmitter: EventService,
    private regionService: RegionService,
  ) {
  }

  async create(region: string, user: string, dto: CreateTrainerDto): Promise<Trainer> {
    const regionDoc = await this.regionService.findOne(region);
    if (!regionDoc) {
      throw new NotFoundException('Region not found');
    }
    const {area, x, y} = regionDoc.spawn;
    const trainer: Omit<Trainer, keyof GlobalSchema> = {
      ...dto,
      region,
      user,
      coins: 0,
      area,
      x,
      y,
      direction: Direction.DOWN,
    };
    try {
      const created = await this.model.create(trainer);
      created && this.emit('created', created);
      return created;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('Trainer already exists');
      }
      throw err;
    }
  }

  async upsert(filter: FilterQuery<Trainer>, update: UpdateQuery<Trainer>): Promise<TrainerDocument> {
    const result = await this.model.findOneAndUpdate(filter, update, {upsert: true, new: true, rawResult: true}).exec();
    if (!result.value) {
      throw new Error('Upsert failed');
    }
    const trainer = result.value;
    this.emit(result.lastErrorObject?.updatedExisting ? 'updated' : 'created', trainer);
    return trainer;
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

  async getLocations(): Promise<MoveTrainerDto[]> {
    return this.model.find().select(MOVE_TRAINER_PROPS).exec();
  }

  async saveLocations(locations: MoveTrainerDto[]): Promise<void> {
    await this.model.bulkWrite(locations.map(({_id, ...rest}) => ({
      updateOne: {
        filter: {_id},
        update: {$set: rest},
      },
    })));
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
