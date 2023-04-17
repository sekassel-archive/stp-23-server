export const expGain = (defeatedMonsterLevel: number): number => Math.round(defeatedMonsterLevel * 10 * (0.9 + Math.random() * 0.2));
export const expRequired = (currentLevel: number): number => currentLevel ** 3 - (currentLevel - 1) ** 3;

export const healthGain = (level: number) => 2 + Math.round(Math.random() * 2);
export const attackGain = (level: number) => 2 + Math.round(Math.random());
export const defenseGain = (level: number) => 2 + Math.round(Math.random());
export const speedGain = (level: number) => 1 + Math.round(Math.random() * 2);

export const healthAtLevel = (level: number) => 7 + level * 3;
export const attackAtLevel = (level: number) => 5 + Math.round(level * 2.5);
export const defenseAtLevel = (level: number) => 5 + Math.round(level * 2.5);
export const speedAtLevel = (level: number) => 3 + level * 2;

export const EVOLUTION_LEVELS = [10, 20];
export const SAME_TYPE_ATTACK_MULTIPLIER = 1.5;
