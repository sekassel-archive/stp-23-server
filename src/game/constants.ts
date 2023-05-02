import {ApiProperty, ApiPropertyOptional, OmitType} from '@nestjs/swagger';
import {IsObject, IsOptional, Max, Min} from 'class-validator';
import * as _abilities from '../../assets/abilities.json';
import * as _monsterTypes from '../../assets/monsters.json';
import * as _itemTypes from '../../assets/items.json';
import * as _types from '../../assets/types.json';
import * as _characters from '../../assets/characters.json';

export const characters = _characters;

export type Type = keyof typeof _types;
export const types: Record<Type, TypeDefinition> = _types;

export interface TypeDefinition {
  multipliers: Partial<Record<string, number>>;
}

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
  description: string;

  // TODO use?: UseType enum {simple, ball, potion}

  // @ApiProperty()
  effects: Effect[];

  // TODO add '*'
  // @ApiPropertyOptional({properties: Object.fromEntries(Object.keys(types).map(t => [t, {type: 'number', optional: true}]))})
  @IsOptional()
  @IsObject()
  catch?: Partial<Record<Type | '*', number>>;
}

export class ItemTypeDto extends OmitType(ItemType, ['effects', 'catch'] as const) {
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

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  evolution?: number;
}

export class MonsterTypeDto extends OmitType(MonsterType, ['evolution'] as const) {
}

export const monsterTypes: MonsterType[] = _monsterTypes;

export class AttributeEffect {
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

export class StatusEffect {
  @ApiProperty()
  status: string;

  @ApiPropertyOptional({minimum: 0, maximum: 1})
  @Min(0)
  @Max(1)
  chance?: number;

  @ApiProperty()
  self?: boolean;

  @ApiProperty()
  remove?: boolean;
}

export type Effect = AttributeEffect | StatusEffect;

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
  maxUses: number;

  minLevel: number;
  effects: Effect[];
}

export class AbilityDto extends OmitType(Ability, ['minLevel', 'effects'] as const) {
  @ApiProperty({description: 'The highest chance of any effect.', minimum: 0, maximum: 1})
  accuracy: number;

  @ApiProperty({description: 'The amount of damage this ability does.', minimum: 0})
  power: number;
}

export const abilities: Ability[] = _abilities;

export const TALL_GRASS_ENCOUNTER_CHANCE = 0.1;

export const TALL_GRASS_TRAINER = '0'.repeat(24);

export const RESULTS_WITH_DESCRIPTION = {
  'ability-super-effective': 'The ability was super effective',
  'ability-effective': 'The ability was very effective',
  'ability-normal': 'The ability was effective',
  'ability-ineffective': 'The ability was not very effective',
  'ability-no-effect': 'The ability had no effect',
  'target-defeated': 'The target monster was defeated',
  'monster-defeated': 'The monster was defeated',
  'monster-levelup': 'The monster leveled up',
  'monster-evolved': 'The monster evolved',
  'monster-learned': 'The monster learned a new ability',
  'item-use-success': 'The item was used successfully',
  // Error cases
  'monster-dead': 'The monster is dead',
  'ability-unknown': 'The monster doesn\'t have the ability, or the ability ID does not exist',
  'ability-no-uses': 'The monster doesn\'t have any uses left for the ability',
  'target-unknown': 'The target trainer does not exist or has fled',
  'target-dead': 'The target monster is already dead',
  'item-use-failed': 'The item could not be used',
} as const;

export const RESULTS = Object.keys(RESULTS_WITH_DESCRIPTION);
export type Result = keyof typeof RESULTS_WITH_DESCRIPTION;
