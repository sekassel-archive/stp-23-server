import {PickType} from '@nestjs/swagger';
import {PartialType} from '../../util/partial-type';
import {Player} from './player.schema';

export class CreatePlayerDto {
}

export class UpdatePlayerDto extends PartialType(CreatePlayerDto) {
}

export class MovePlayerDto extends PickType(Player, ['_id', 'area', 'x', 'y'] as const) {
}
