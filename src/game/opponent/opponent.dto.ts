import {PickType} from '@nestjs/swagger';
import {Opponent} from './opponent.schema';

export class UpdateOpponentDto extends PickType(
  Opponent,
  ['move'] as const,
) {
}
