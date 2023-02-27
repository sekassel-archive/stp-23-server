import {PartialType} from '../util/partial-type';

export class CreatePlayerDto {
}

export class UpdatePlayerDto extends PartialType(CreatePlayerDto) {
}
