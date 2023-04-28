import {PickType} from '@nestjs/swagger';
import {Opponent} from './opponent.schema';

export class CreateOpponentDto extends PickType(Opponent, [
  'isAttacker',
  'isNPC',
  'monster',
] as const) {
}

export class UpdateOpponentDto extends PickType(Opponent, [
  'move',
  'monster',
] as const) {
}
