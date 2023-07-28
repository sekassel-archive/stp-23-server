import {Monster} from './monster/monster.schema';
import {Ability, MonsterStatus} from './constants';

export const expGain = (defeatedMonsterLevel: number): number => Math.round(defeatedMonsterLevel * 10 * (0.9 + Math.random() * 0.2));
export const expRequired = (currentLevel: number): number => currentLevel ** 3 - (currentLevel - 1) ** 3;
export const levelFromExp = (exp: number): number => Math.floor(Math.cbrt(exp));

export const coinsGain = (defeatedMonsterLevel: number): number => Math.round(defeatedMonsterLevel * 20 * (0.9 + Math.random() * 0.2));

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
  for (const e of ab.effects) {
    if ('status' in e && !attackerStatus.includes(e.status as MonsterStatus)) {
      score += e.chance || 1;
    }
    if ('attribute' in e && e.attribute !== 'health') {
      score += Math.abs(e.amount * .5) * (e.chance || 1);
    }
  }
  return score;
}
