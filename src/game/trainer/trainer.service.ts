import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, Types, UpdateQuery} from 'mongoose';

import {EventService} from '../../event/event.service';
import {RegionService} from '../../region/region.service';
import {GlobalSchema} from '../../util/schema';
import {CreateTrainerDto} from './trainer.dto';
import {Direction, Trainer, TrainerDocument} from './trainer.schema';
import {DeleteManyResult, EventRepository, MongooseRepository} from "@mean-stream/nestx";
import {Spawn} from "../../region/region.schema";
import {Monster} from "../monster/monster.schema";

@Injectable()
@EventRepository()
export class TrainerService extends MongooseRepository<Trainer> {
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

  // Avoid EventRepository decorator using a new method name
  updateWithoutEvent(id: Types.ObjectId, update: UpdateQuery<Trainer>): Promise<TrainerDocument | null> {
    return super.update(id, update);
  }

  private emit(event: string, trainer: Trainer): void {
    this.eventEmitter.emit(`regions.${trainer.region}.trainers.${trainer._id}.${event}`, trainer);
  }

  async deleteUnprogressed(olderThanMs: number, spawn: Spawn): Promise<DeleteManyResult> {
    const pipeline = [
      {
        $match: {
          createdAt: {
            $lt: new Date(Date.now() - olderThanMs),
          },
          area: spawn.area,
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
}
