import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {EventService} from '../../event/event.service';
import {CreateOpponentDto} from './opponent.dto';
import {Opponent, OpponentDocument} from './opponent.schema';
import {EventRepository, MongooseRepository} from "@mean-stream/nestx";

@Injectable()
@EventRepository()
export class OpponentService extends MongooseRepository<Opponent> {
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
      coins: 0,
    });
  }

  emit(event: string, opponent: Opponent) {
    this.eventService.emit(`encounters.${opponent.encounter}.opponents.${opponent._id}.${event}`, opponent);
    this.eventService.emit(`encounters.${opponent.encounter}.trainers.${opponent.trainer}.opponents.${opponent._id}.${event}`, opponent);
  }
}
