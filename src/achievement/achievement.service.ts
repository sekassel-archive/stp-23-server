import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AchievementSummary } from '../achievement-summary/achievement-summary.dto';

import { EventService } from '../event/event.service';
import { CreateAchievementDto, UpdateAchievementDto } from './achievement.dto';
import { Achievement } from './achievement.schema';

@Injectable()
export class AchievementService {
  constructor(
    @InjectModel('achievements') private model: Model<Achievement>,
    private eventEmitter: EventService,
  ) {
  }

  async create(user: string, id: string, achievement: CreateAchievementDto): Promise<Achievement> {
    const res = await this.model.findOneAndUpdate({ user, id }, { ...achievement, user, id }, {
      upsert: true,
      new: true,
      rawResult: true,
    });
    const { value } = res;
    if (!value) {
      throw new Error('Failed to create achievement');
    }

    this.emit(res.lastErrorObject?.updatedExisting ? 'updated' : 'created', value);
    return value;
  }

  async findAll(user: string, filter?: FilterQuery<Achievement>): Promise<Achievement[]> {
    return this.model.find({ ...filter, user }).exec();
  }

  async findOne(user: string, id: string): Promise<Achievement | null> {
    return this.model.findOne({ user, id }).exec();
  }

  async update(user: string, id: string, dto: UpdateAchievementDto): Promise<Achievement | null> {
    const updated = await this.model.findOneAndUpdate({ user, id }, dto, { new: true }).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteUser(user: string): Promise<Achievement[]> {
    const achievements = await this.model.find({ user }).exec();
    for (const achievement of achievements) {
      this.emit('deleted', achievement);
    }
    await this.model.deleteMany({ user }).exec();
    return achievements;
  }

  async delete(user: string, id: string): Promise<Achievement | null> {
    const deleted = await this.model.findOneAndDelete({ user, id }).exec();
    deleted && this.emit('deleted', deleted);
    return deleted;
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
