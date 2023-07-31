import * as fs from 'fs/promises'

const hits = 4;
const baseHp = 10;
const hpPerLevel = 4;

const normalLevels = [1, 1, 3, 5, 12, 18, 25, 32];
const normalDamageMultiplier = 0.8;
const minSpecialLevel = 3;
const maxSpecialLevel = 40;

const abilitiesByType = JSON.parse(await fs.readFile('abilities.json', 'utf-8'));
const types = Object.keys(abilitiesByType);

for (const type of types) {
  const abilities = abilitiesByType[type];
  for (let i = 0; i < abilities.length; i++) {
    const ability = abilities[i];
    // ability.minLevel = type === 'normal' ? normalLevels[i] : Math.round(i / abilities.length * (maxSpecialLevel - minSpecialLevel)) + minSpecialLevel;

    const healthEffect = ability.effects.find(effect => effect.attribute === 'health' && effect.amount < 0);
    if (healthEffect) {
      const otherEffects = ability.effects.filter(effect => effect.attribute !== 'health' && effect.amount).reduce((sum, effect) => sum + effect.amount, 0);
      let targetDamage = (baseHp + ability.minLevel * hpPerLevel) / hits - otherEffects;
      if (type === 'normal') {
        targetDamage *= normalDamageMultiplier;
      }
      targetDamage = -Math.round(targetDamage);
      if (targetDamage !== healthEffect.amount) {
        console.log(`${ability.name} ${type} damage is ${healthEffect.amount} but should be ${targetDamage} (${targetDamage - healthEffect.amount})`);
      }
    }
  }
}

const levels = [];

for (const type of types) {
  for (const ability of abilitiesByType[type]) {
    const healthEffect = ability.effects.find(effect => effect.attribute === 'health' && effect.amount < 0);
    if (healthEffect) {
      (levels[ability.minLevel] ||= {})[type] = -healthEffect.amount;
    }
  }
}

console.log(['level', ...types].join('\t'));
for (const level in levels) {
  console.log(level + '\t' + [...types].map(type => levels[level][type] || '').join('\t'));
}

for (const level in levels) {
  if (level < 5) {
    continue;
  }

  for (const type of types) {
    if (type === 'normal') {
      continue;
    }

    const abilities = findBestAbilities([...abilitiesByType['normal'], ...abilitiesByType[type]].filter(a => a.minLevel <= level));
    const typeAbilities = abilities.filter(a => a.type === type);
    const normalAbilities = abilities.filter(a => a.type === 'normal');
    if (typeAbilities.length < normalAbilities.length) {
      console.log(`At level ${level}, a ${type} monster has only ${typeAbilities.length} ${type} but ${normalAbilities.length} normal abilities`);
    }
  }
}

function findBestAbilities(abilities) {
  return abilities
    // sort by minLevel descending - we want the best abilities
    .sort((a, b) => b.minLevel - a.minLevel)
    // take the best
    .slice(0, hits);
}

await fs.writeFile('abilities.json', JSON.stringify(abilitiesByType, null, 2));
