import {PartialType} from '../util/partial-type';

export class CreateMonsterDto {
}

export class UpdateMonsterDto extends PartialType(CreateMonsterDto) {
}
