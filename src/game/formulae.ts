import {Monster} from './monster/monster.schema';
import {Ability, MonsterStatus, StatusEffect, AttributeEffect, Type} from './constants';

// TODO improve experience gain?
export const expGain = (defeatedMonsterLevel: number): number => Math.round(defeatedMonsterLevel * 10 * (0.9 + Math.random() * 0.2));
export const expRequired = (currentLevel: number): number => currentLevel ** 3 - (currentLevel - 1) ** 3;
export const levelFromExp = (exp: number): number => Math.floor(Math.cbrt(exp));

export const coinsGain = (defeatedMonsterLevel: number): number => Math.round(defeatedMonsterLevel * 20 * (0.9 + Math.random() * 0.2));

export const healthGain = (level: number) => 3 + Math.round(Math.random() * 2);
export const attackGain = (level: number) => 2 + Math.round(Math.random());
export const defenseGain = (level: number) => 2 + Math.round(Math.random());
export const speedGain = (level: number) => 1 + Math.round(Math.random() * 2);

export const healthAtLevel = (level: number) => 10 + level * 4;
export const attackAtLevel = (level: number) => 5 + Math.round(level * 2.5);
export const defenseAtLevel = (level: number) => 5 + Math.round(level * 2.5);
export const speedAtLevel = (level: number) => 3 + level * 2;

export const EVOLUTION_LEVELS = [10, 20];
export const SAME_TYPE_ATTACK_MULTIPLIER = 1.5;
export const STATUS_FAIL_CHANCE: Partial<Record<MonsterStatus, number>> = {
  [MonsterStatus.ASLEEP]: 1,
  [MonsterStatus.PARALYSED]: 0.5,
  [MonsterStatus.FROZEN]: 0.5,
};
export const STATUS_REMOVE_CHANCE = 0.25;

export const STATUS_DAMAGE: Partial<Record<MonsterStatus, [number, Type]>> = {
  [MonsterStatus.POISONED]: [3, 'poison'],
  [MonsterStatus.BURNED]: [3, 'fire'],
  [MonsterStatus.FROZEN]: [3, 'ice'],
};

export const relativeStrengthMultiplier = (current: Monster, target: Monster): number => {
  const ratio = current.attributes.attack / target.attributes.defense;
  if (ratio < 0.5) {
    return 0.5;
  }
  if (ratio > 2) {
    return 2;
  }
  return ratio;
}

export const catchChanceBonus = (target: Monster) => {
  // 90% health => (1-0.9)^3 = 0.1% bonus
  // 50% health => (1-0.5)^3 = 12.5% bonus
  // 10% health => (1-0.1)^3 = 73% bonus
  // 5% health => (1-0.05)^3 = 86.4% bonus
  const healthBonus = (1 - target.currentAttributes.health / target.attributes.health) ** 3;
  // each status condition adds 25% bonus
  const statusBonus = target.status.length * 0.25;
  return healthBonus + statusBonus;
}

export const abilityStatusScore = (attackerStatus: MonsterStatus[], ab: Ability) => {
  let score = 0;
  ab.effects.filter((e): e is StatusEffect => 'status' in e).forEach(e => {
    //TODO: Adrian fix this
    //if((<any>Object).values(MonsterStatus).includes(e.status) && !attackerStatus.includes(MonsterStatus[e.status])) {
    if((<any>Object).values(MonsterStatus).includes(e.status)) {
      score += e.chance || 1;
    }
  });

  ab.effects.filter((e): e is AttributeEffect => 'attribute' in e && e.attribute !== 'health').forEach(e => {
    score += Math.abs(e.amount * .5) * (e.chance || 1);
  });

  return score;
}
