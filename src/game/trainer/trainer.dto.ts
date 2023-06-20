import {ApiProperty, PickType} from '@nestjs/swagger';
import {PartialType} from '../../util/partial-type';
import {MONGO_ID_FORMAT} from '../../util/schema';
import {Trainer} from './trainer.schema';
import {AsObjectId} from "@mean-stream/nestx";
import {Types} from "mongoose";

export class CreateTrainerDto extends PickType(Trainer, [
  'name',
  'image',
]) {
}

export class UpdateTrainerDto extends PartialType(PickType(Trainer, [
  'name',
  'image',
  'team',
] as const)) {
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
    description: `The ID of the target trainer.
- Talking to a Nurse (npc.canHeal) will heal all monsters.
- Talking to someone who offers Starters (npc.starters) will allow you to receive a starter monster.
- Talking to a Trainer (npc.encounterOnSight) will start an encounter, even if that NPC already battled with you ("rematch").`,
  })
  @AsObjectId()
  target: Types.ObjectId;

  @ApiProperty({
    description: 'The selection for some NPC dialog options. ' +
      'For example, Prof. Albert will ask you to select a starter monster (0, 1 or 2).',
  })
  selection?: number;
}
