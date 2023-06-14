import {ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Cron, CronExpression} from '@nestjs/schedule';
import {FilterQuery, Model, Types} from 'mongoose';

import {EventService} from '../../event/event.service';
import {RegionService} from '../../region/region.service';
import {GlobalSchema} from '../../util/schema';
import {CreateTrainerDto, MOVE_TRAINER_PROPS, MoveTrainerDto} from './trainer.dto';
import {Direction, Trainer, TrainerDocument} from './trainer.schema';
import {DeleteManyResult, EventRepository, MongooseRepository} from "@mean-stream/nestx";
import {Spawn} from "../../region/region.schema";
import {OnEvent} from "@nestjs/event-emitter";

@Injectable()
@EventRepository()
export class TrainerService extends MongooseRepository<Trainer> implements OnModuleInit, OnModuleDestroy {
  locations = new Map<string, MoveTrainerDto>;

  constructor(
    @InjectModel(Trainer.name) model: Model<Trainer>,
    private eventEmitter: EventService,
    private regionService: RegionService,
  ) {
    super(model);
  }

  async createSimple(region: Types.ObjectId, user: string, dto: CreateTrainerDto): Promise<Trainer> {
    const regionDoc = await this.regionService.find(region);
    if (!regionDoc) {
      throw new NotFoundException('Region not found');
    }
    const {area, x, y} = regionDoc.spawn;
    return this.create({
      ...dto,
      region: region.toString(),
      user,
      coins: 0,
      area,
      x,
      y,
      direction: Direction.DOWN,
    });
  }

  async create(trainer: Omit<Trainer, keyof GlobalSchema>): Promise<TrainerDocument> {
    try {
      return await super.create(trainer);
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('Trainer already exists');
      }
      throw err;
    }
  }

  async find(id: Types.ObjectId): Promise<TrainerDocument | null> {
    const result = await super.find(id);
    result && this.addLocation(result);
    return result;
  }

  async findOne(id: Types.ObjectId): Promise<TrainerDocument | null> {
    const result = await super.findOne(id);
    result && this.addLocation(result);
    return result;
  }

  async findAll(filter: FilterQuery<Trainer>): Promise<TrainerDocument[]> {
    const results = await super.findAll(filter);
    for (const result of results) {
      this.addLocation(result);
    }
    return results;
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

  private emit(event: string, trainer: Trainer): void {
    this.eventEmitter.emit(`regions.${trainer.region}.trainers.${trainer._id}.${event}`, trainer);
  }

  async deleteUnprogressed(olderThanMs: number, spawn: Spawn, radius = 5): Promise<DeleteManyResult> {
    const pipeline = [
      {
        $match: {
          createdAt: {
            $lt: new Date(Date.now() - olderThanMs),
          },
          area: spawn.area,
          x: {
            $gt: spawn.x - radius,
            $lt: spawn.x + radius,
          },
          y: {
            $gt: spawn.y - radius,
            $lt: spawn.y + radius,
          },
        } satisfies FilterQuery<Trainer>,
      },
      {
        $addFields: {
          id: {
            $toString: '$_id'
          },
        },
      },
      {
        $lookup: {
          from: 'monsters',
          localField: 'id',
          foreignField: 'trainer',
          as: 'monsters',
        },
      },
      {
        $match: {
          coins: 0,
          npc: {$exists: false},
          $or: [
            {monsters: {$size: 0}},
            {
              'monsters.0.level': 1,
              'monsters.0.experience': 0,
            },
          ],
        } satisfies FilterQuery<Trainer>,
      },
      {
        $project: {
          id: 0,
          monsters: 0,
        },
      },
    ];
    const trainers = await this.model.aggregate(pipeline);
    return this.deleteAll(trainers);
  }

  // --------------- Movement/Locations ---------------

  @OnEvent('regions.*.trainers.*.created')
  async onTrainerCreated(trainer: Trainer): Promise<void> {
    this.setLocation(trainer._id.toString(), {
      _id: trainer._id,
      area: trainer.area,
      x: trainer.x,
      y: trainer.y,
      direction: trainer.direction,
    });
  }

  @OnEvent('regions.*.trainers.*.deleted')
  async onTrainerDeleted(trainer: Trainer): Promise<void> {
    this.locations.delete(trainer._id.toString());
  }

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
    for await (const doc of this.model.find().select([...MOVE_TRAINER_PROPS])) {
      this.setLocation(doc._id.toString(), doc.toObject());
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
