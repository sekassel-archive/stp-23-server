import {PickType} from '@nestjs/swagger';
import {PartialType} from '../../util/partial-type';
import {Trainer} from './trainer.schema';

export class CreateTrainerDto extends PickType(Trainer, [
  'name',
  'image',
]) {
}

export class UpdateTrainerDto extends PartialType(CreateTrainerDto) {
}

export class MoveTrainerDto extends PickType(Trainer, [
  '_id',
  'area',
  'x',
  'y',
  'direction',
] as const) {
}
