import {ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Cron, CronExpression} from '@nestjs/schedule';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';

import {EventService} from '../../event/event.service';
import {RegionService} from '../../region/region.service';
import {GlobalSchema} from '../../util/schema';
import {CreateTrainerDto, MOVE_TRAINER_PROPS, MoveTrainerDto, UpdateTrainerDto} from './trainer.dto';
import {Direction, Trainer, TrainerDocument} from './trainer.schema';
import {Item} from "../item/item.schema";

@Injectable()
export class TrainerService implements OnModuleInit, OnModuleDestroy {
  locations = new Map<string, MoveTrainerDto>;

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
      items: [],
      area,
      x,
      y,
      direction: Direction.DOWN,
    };
    try {
      const created = await this.model.create(trainer);
      created && this.emit('created', created);
      created && this.setLocation(created._id.toString(), {
        _id: created._id,
        area,
        x,
        y,
        direction: created.direction,
      });
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

  async findAll(filter: FilterQuery<Trainer>): Promise<Trainer[]> {
    const results = await this.model.find(filter).exec();
    for (const result of results) {
      this.addLocation(result);
    }
    return results;
  }

  async findOne(id: string): Promise<Trainer | null> {
    const result = await this.model.findById(id).exec();
    result && this.addLocation(result);
    return result;
  }

  addLocation(doc: Trainer) {
    const location = this.getLocation(doc._id.toString());
    if (!location) {
      return;
    }
    for (const key of MOVE_TRAINER_PROPS) {
      // @ts-ignore
      doc[key] = location[key];
    }
  }

  async update(id: string, dto: UpdateQuery<Trainer>): Promise<Trainer | null> {
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

  // --------------- Movement/Locations ---------------

  getLocations(): IterableIterator<MoveTrainerDto> {
    return this.locations.values();
  }

  getLocation(id: string): MoveTrainerDto | undefined {
    return this.locations.get(id);
  }

  getTrainerAt(area: string, x: number, y: number): MoveTrainerDto | undefined {
    for (const location of this.locations.values()) {
      if (location.area === area && location.x === x && location.y === y) {
        return location;
      }
    }
    return undefined;
  }

  setLocation(id: string, dto: MoveTrainerDto): void {
    this.locations.set(id, dto);
  }

  async onModuleInit() {
    for await (const doc of this.model.find().select(MOVE_TRAINER_PROPS)) {
      this.locations.set(doc._id.toString(), doc);
    }
  }

  async onModuleDestroy() {
    await this.flushLocations();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async flushLocations() {
    await this.saveLocations(Array.from(this.locations.values()));
  }

  async saveLocations(locations: MoveTrainerDto[]) {
    await this.model.bulkWrite(locations.map(({_id, ...rest}) => ({
      updateOne: {
        filter: {_id},
        update: {$set: rest},
      },
    })));
  }
}
