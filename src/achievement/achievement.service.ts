import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';
import {AchievementSummary} from '../achievement-summary/achievement-summary.dto';

import {EventService} from '../event/event.service';
import {Achievement} from './achievement.schema';
import {EventRepository, MongooseRepository} from "@mean-stream/nestx";

@Injectable()
@EventRepository()
export class AchievementService extends MongooseRepository<Achievement, never> {
  constructor(
    @InjectModel(Achievement.name) model: Model<Achievement>,
    private eventEmitter: EventService,
  ) {
    super(model as any);
  }

  private emit(event: string, achievement: Achievement): void {
    this.eventEmitter.emit(`users.${achievement.user}.achievements.${achievement.id}.${event}`, achievement);
  }

  async summary(filter: FilterQuery<Achievement> = {}): Promise<AchievementSummary[]> {
    return this.model.aggregate([
      {$match: filter},
      {
        $group: {
          _id: '$id',
          active: { $sum: 1 },
          unlocked: { $sum: { $cond: [{ $ne: ['$unlockedAt', null] }, 1, 0] } },
          progress: { $sum: '$progress' },
        },
      },
      {$addFields: { id: '$_id' }},
      {$project: { _id: 0 }},
    ]);
  }

  async summaryOne(id: string): Promise<AchievementSummary> {
    return (await this.summary({ id }))[0];
  }
}
