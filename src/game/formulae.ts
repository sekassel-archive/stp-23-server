import {Monster} from './monster/monster.schema';

export const expGain = (defeatedMonsterLevel: number): number => Math.round(defeatedMonsterLevel * 10 * (0.9 + Math.random() * 0.2));
export const expRequired = (currentLevel: number): number => currentLevel ** 3 - (currentLevel - 1) ** 3;

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
