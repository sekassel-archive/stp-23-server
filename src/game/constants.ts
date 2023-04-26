import {ApiProperty, ApiPropertyOptional, OmitType} from '@nestjs/swagger';
import {Max, Min} from 'class-validator';
import * as _abilities from '../../assets/abilities.json';
import * as _monsterTypes from '../../assets/monsters.json';
import * as _itemTypes from '../../assets/items.json';
import * as _types from '../../assets/types.json';
import * as _characters from '../../assets/characters.json';

export const characters = _characters;

export const types = _types;
export type Type = keyof typeof types;

export class ItemType {
  @ApiProperty()
  id: number;

  @ApiProperty()
  image: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  effects: Effect[];

  @ApiPropertyOptional()
  description?: string;
}

export class ItemTypeDto extends OmitType(ItemType, ['description'] as const) {
}

export const itemTypes: ItemType[] = _itemTypes;

export class MonsterType {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  image: string;

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

  @ApiPropertyOptional({minimum: 0, maximum: 1})
  @Min(0)
  @Max(1)
  chance?: number;

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
  @ApiProperty({description: 'The highest chance of any effect.', minimum: 0, maximum: 1})
  accuracy: number;

  @ApiProperty({description: 'The amount of damage this ability does.', minimum: 0})
  power: number;
}

export const abilities: Ability[] = _abilities;

