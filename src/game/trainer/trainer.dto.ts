import {ApiProperty, PickType} from '@nestjs/swagger';
import {IsMongoId} from 'class-validator';
import {PartialType} from '../../util/partial-type';
import {MONGO_ID_FORMAT} from '../../util/schema';
import {Trainer} from './trainer.schema';

export class CreateTrainerDto extends PickType(Trainer, [
  'name',
  'image',
]) {
}

export class UpdateTrainerDto extends PartialType(CreateTrainerDto) {
}

export const MOVE_TRAINER_PROPS = [
  '_id',
  'area',
  'x',
  'y',
  'direction',
] as const;

export class MoveTrainerDto extends PickType(Trainer, MOVE_TRAINER_PROPS) {
}

export class TalkTrainerDto extends PickType(Trainer, ['_id']) {
  @ApiProperty({
    ...MONGO_ID_FORMAT,
    description: 'The ID of the target trainer. ' +
      'Talking to a Nurse (npc.canHeal) will heal all monsters. ' +
      'Talking to a Trainer (npc.encounterOnSight) will start an encounter, even if that NPC already battled with you ("rematch").',
  })
  @IsMongoId()
  target: string;
}
