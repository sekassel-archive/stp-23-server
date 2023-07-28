import {ApiProperty, ApiPropertyOptional, OmitType} from '@nestjs/swagger';
import {Max, Min} from 'class-validator';
import * as _abilities from '../../assets/abilities.json';
import * as _characters from '../../assets/characters.json';
import * as _monsterTypes from '../../assets/monsters.json';
import * as _itemTypes from '../../assets/items.json';
import * as _types from '../../assets/types.json';
import {MonsterAttributes} from "./monster/monster.schema";

export const characters = _characters;

export type Type = keyof typeof _types;
export const types: Record<Type, TypeDefinition> = _types;

export interface TypeDefinition {
  multipliers: Partial<Record<string, number>>;
  statBonus: Record<keyof MonsterAttributes, number>;
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

  @ApiPropertyOptional({enum: ['ball', 'effect', 'itemBox', 'monsterBox']})
  use?: string;

  effects?: Effect[];
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

export const baseMonsterTypes: MonsterType[] = monsterTypes.filter((m, index) => {
  return index === 0 || monsterTypes[index - 1].evolution !== m.id;
});

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

export const StatusResults = ['added', 'removed', 'unchanged'] as const;
export type StatusResult = typeof StatusResults[number];

export enum MonsterStatus {
  PARALYSED = 'paralysed',
  ASLEEP = 'asleep',
  POISONED = 'poisoned',
  BURNED = 'burned',
  FROZEN = 'frozen',
  CONFUSED = 'confused',
  STUNNED = 'stunned',
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
export const abilityMap: Record<number, Ability> = Object.fromEntries(abilities.map(a => [a.id, a]));

export const TALL_GRASS_ENCOUNTER_CHANCE = 0.1;
export const TALL_GRASS_TRAINER = '0'.repeat(24);

export const MAX_TEAM_SIZE = 6;
export const MAX_ABILITIES = 4;

export const NPC_SIGHT_RANGE = 5;

export const STARTER_LEVEL = 5;
export const EVOLUTION_LEVELS = [10, 20];
export const SAME_TYPE_ATTACK_MULTIPLIER = 1.5;

export const ATTRIBUTE_VALUES: Record<keyof MonsterAttributes, { base: number; levelUp: [number, number] }> = {
  health: {
    base: 10,
    levelUp: [3, 5],
  },
  attack: {
    base: 5,
    levelUp: [2, 3],
  },
  defense: {
    base: 5,
    levelUp: [2, 3],
  },
  speed: {
    base: 3,
    levelUp: [1, 3],
  },
};

export const STATUS_ABILITY_CHANCE = 0.2;
export const STATUS_FAIL_CHANCE: Partial<Record<MonsterStatus, number>> = {
  [MonsterStatus.ASLEEP]: 1,
  [MonsterStatus.PARALYSED]: 0.5,
  [MonsterStatus.FROZEN]: 0.5,
  [MonsterStatus.STUNNED]: 1,
};
export const STATUS_REMOVE_CHANCE: Record<MonsterStatus, number> = {
  [MonsterStatus.ASLEEP]: 0.25,
  [MonsterStatus.PARALYSED]: 0.25,
  [MonsterStatus.POISONED]: 0.25,
  [MonsterStatus.BURNED]: 0.25,
  [MonsterStatus.FROZEN]: 0.25,
  [MonsterStatus.CONFUSED]: 0.25,
  [MonsterStatus.STUNNED]: 1,
};
export const STATUS_CONFUSED_SELF_HIT_CHANCE = 0.5;
export const STATUS_DAMAGE: Partial<Record<MonsterStatus, [number, Type]>> = {
  [MonsterStatus.POISONED]: [3, 'poison'],
  [MonsterStatus.BURNED]: [3, 'fire'],
  [MonsterStatus.FROZEN]: [3, 'ice'],
};
