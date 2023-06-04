import {ConflictException, Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {EventService} from '../../event/event.service';
import {CreateOpponentDto} from './opponent.dto';
import {Opponent, OpponentDocument} from './opponent.schema';
import {EventRepository, MongooseRepository} from "@mean-stream/nestx";

@Injectable()
@EventRepository()
export class OpponentService extends MongooseRepository<Opponent, never> {
  constructor(
    @InjectModel(Opponent.name) model: Model<Opponent>,
    private eventService: EventService,
  ) {
    super(model as any);
  }

  async createSimple(encounter: string, trainer: string, dto: CreateOpponentDto): Promise<OpponentDocument> {
    return this.create({
      ...dto,
      encounter,
      trainer,
      results: [],
    });
  }

  async create(dto: Omit<Opponent, 'createdAt' | 'updatedAt'>): Promise<OpponentDocument> {
    try {
      return await super.create(dto);
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException(`Opponent ${dto.trainer} already exists in encounter ${dto.encounter}`);
      }
      throw err;
    }
  }

  emit(event: string, opponent: Opponent) {
    this.eventService.emit(`encounters.${opponent.encounter}.opponents.${opponent.trainer}.${event}`, opponent);
  }
}
