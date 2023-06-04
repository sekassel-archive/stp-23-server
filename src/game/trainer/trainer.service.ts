import {ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Cron, CronExpression} from '@nestjs/schedule';
import {FilterQuery, Model, Types} from 'mongoose';

import {EventService} from '../../event/event.service';
import {RegionService} from '../../region/region.service';
import {GlobalSchema} from '../../util/schema';
import {CreateTrainerDto, MOVE_TRAINER_PROPS, MoveTrainerDto} from './trainer.dto';
import {Direction, Trainer, TrainerDocument} from './trainer.schema';
import {EventRepository, MongooseRepository} from "@mean-stream/nestx";

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
      team: [],
      encounteredMonsterTypes: [],
      area,
      x,
      y,
      direction: Direction.DOWN,
    });
  }

  async create(trainer: Omit<Trainer, keyof GlobalSchema>): Promise<TrainerDocument> {
    try {
      const created = await super.create(trainer);
      created && this.setLocation(created._id.toString(), {
        _id: created._id,
        area: trainer.area,
        x: trainer.x,
        y: trainer.y,
        direction: trainer.direction,
      });
      return created;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('Trainer already exists');
      }
      throw err;
    }
  }

  async findAll(filter: FilterQuery<Trainer>): Promise<TrainerDocument[]> {
    const results = await super.findAll(filter);
    for (const result of results) {
      this.addLocation(result);
    }
    return results;
  }

  async findOne(id: Types.ObjectId): Promise<TrainerDocument | null> {
    const result = await super.findOne(id);
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

  async addToTeam(id: Types.ObjectId, monster: string): Promise<Trainer | null> {
    return this.update(id, {$addToSet: {team: monster}});
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
    for await (const doc of this.model.find().select([...MOVE_TRAINER_PROPS])) {
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
