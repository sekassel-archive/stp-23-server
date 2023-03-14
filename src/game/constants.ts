import {ApiProperty, ApiPropertyOptional, OmitType} from '@nestjs/swagger';
import * as _abilities from '../../assets/abilities.json';
import * as _monsterTypes from '../../assets/monsters.json';
import * as _types from '../../assets/types.json';

export const types = _types;
export type Type = keyof typeof types;

export class MonsterType {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string[];

  @ApiPropertyOptional()
  evolution?: number;
}

export class MonsterTypeDto extends OmitType(MonsterType, ['evolution'] as const) {
}

export const monsterTypes: MonsterType[] = _monsterTypes;

export class Effect {
  @ApiProperty()
  attribute: string;

  @ApiProperty({description: 'If `self` is not specified, negative values are subtracted from the target, positive values are added to the target.'})
  amount: number;

  @ApiProperty()
  self?: boolean;
}

export class Ability {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  minLevel: number;

  @ApiProperty()
  maxUses: number;

  @ApiProperty()
  effects: Effect[];
}

export class AbilityDto extends OmitType(Ability, ['minLevel', 'effects'] as const) {
}

export const abilities: Ability[] = _abilities;

