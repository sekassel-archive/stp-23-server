import {PartialType} from '../util/partial-type';

export class CreateMemberDto {
}

export class UpdateMemberDto extends PartialType(CreateMemberDto) {
}
