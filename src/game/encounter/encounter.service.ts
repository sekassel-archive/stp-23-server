import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {EventService} from '../../event/event.service';
import {CreateEncounterDto} from './encounter.dto';
import {Encounter, EncounterDocument} from './encounter.schema';

@Injectable()
export class EncounterService {
  constructor(
    private eventService: EventService,
    @InjectModel(Encounter.name) private model: Model<Encounter>,
  ) {
  }

  async findAll(region: string): Promise<EncounterDocument[]> {
    return this.model.find({region}).exec();
  }

  async findOne(id: string): Promise<EncounterDocument | null> {
    return this.model.findById(id).exec();
  }

  async create(region: string, dto: CreateEncounterDto): Promise<EncounterDocument> {
    const encounter = await this.model.create({
      ...dto,
      region,
    });
    encounter && this.emit('created', encounter);
    return encounter;
  }

  async delete(id: string): Promise<EncounterDocument | null> {
    const deleted = await this.model.findByIdAndDelete(id).exec();
    deleted && this.emit('deleted', deleted);
    return deleted;
  }

  private emit(event: string, encounter: Encounter) {
    this.eventService.emit(`regions.${encounter.region}.encounters.${encounter._id.toString()}.${event}`, encounter);
  }
}
