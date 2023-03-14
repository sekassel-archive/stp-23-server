import {PickType} from '@nestjs/swagger';
import {Monster} from './monster.schema';

export class CreateMonsterDto extends PickType(Monster, [
  'type',
]) {
}
