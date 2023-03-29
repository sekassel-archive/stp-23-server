import {PickType} from "@nestjs/swagger";
import {Item} from "./item.schema";

export class CreateItemDto extends PickType(Item, [
  'type',
  'amount',
]) {
}
