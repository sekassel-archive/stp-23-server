import {PickType} from '@nestjs/swagger';
import {Achievement} from './achievement.schema';

export class UpdateAchievementDto extends PickType(Achievement, [
  'progress',
  'unlockedAt',
] as const) {
}
