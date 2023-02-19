import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';
import {EventService} from '../event/event.service';
import {Region} from './region.schema';

@Injectable()
export class RegionService {
  constructor(
    @InjectModel(Region.name) private model: Model<Region>,
    private eventService: EventService,
  ) {
  }

  async findAll(filter: FilterQuery<Region> = {}): Promise<Region[]> {
    return this.model.find(filter).sort({name: 1}).exec();
  }

  async findOne(id: string): Promise<Region | null> {
    return this.model.findById(id).exec();
  }

  async changeMembers(id: string, delta: number): Promise<Region | null> {
    const updated = await this.model.findByIdAndUpdate(id, {$inc: {members: delta}}, {new: true});
    updated && this.emit('updated', updated);
    return updated;
  }

  private emit(event: string, region: Region): void {
    this.eventService.emit(`regions.${region._id}.${event}`, region);
  }
}
