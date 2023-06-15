import {EventRepository, MongooseRepository} from '@mean-stream/nestx';
import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {EventService} from '../../event/event.service';
import {Encounter} from './encounter.schema';

@Injectable()
@EventRepository()
export class EncounterService extends MongooseRepository<Encounter> {
  constructor(
    private eventService: EventService,
    @InjectModel(Encounter.name) model: Model<Encounter>,
  ) {
    super(model);
  }

  private emit(event: string, encounter: Encounter) {
    this.eventService.emit(`regions.${encounter.region}.encounters.${encounter._id.toString()}.${event}`, encounter);
  }
}
