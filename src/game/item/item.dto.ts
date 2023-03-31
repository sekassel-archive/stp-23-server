import {PickType} from '@nestjs/swagger';
import {NotEquals} from 'class-validator';
import {Item} from './item.schema';

export class CreateItemDto extends PickType(Item, [
  'type',
  'amount',
]) {
  @NotEquals(0)
  amount: number;
}
