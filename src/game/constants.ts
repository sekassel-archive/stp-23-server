import * as _abilities from '../../assets/abilities.json';
import * as _monsterTypes from '../../assets/monsters.json';
import * as _types from '../../assets/types.json';

export const abilities = _abilities;
export const types = _types;
export const monsterTypes = _monsterTypes;
export type Type = keyof typeof types;
export type Ability = typeof abilities[number];
export type MonsterType = typeof monsterTypes[number];
