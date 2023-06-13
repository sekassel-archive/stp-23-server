const region = 'Albertania';
import * as fs from 'node:fs/promises';
import chalk from 'chalk';

const foundMonsters = {};
const areaLevels = {};

for (const file of await fs.readdir(`maps/${region}/`)) {
  const area = file.slice(0, -5);
  const map = JSON.parse(await fs.readFile(`maps/${region}/${file}`, 'utf8'));
  for (const layer of map.layers) {
    if (!layer.objects) {
      continue;
    }

    for (const object of layer.objects) {
      if (object.type !== 'Trainer' && object.type !== 'TallGrass') {
        continue;
      }

      const monstersProp = object.properties?.find(p => p.name === 'Monsters')?.value;
      if (monstersProp) {
        const monsters = JSON.parse(monstersProp);
        for (const [type, level] of monsters) {
          (foundMonsters[type] ||= new Set).add(area);
          (areaLevels[area] ||= []).push(level);
        }
      }

      const startersProp = object.properties?.find(p => p.name === 'Starters')?.value;
      if (startersProp) {
        const starters = JSON.parse(startersProp);
        for (const type of starters) {
          (foundMonsters[type] ||= new Set).add(area + ' (starter)');
        }
      }
    }
  }
}

const monsters = JSON.parse(await fs.readFile('monsters.json'));
const baseMonsters = monsters.filter((m, index) => index === 0 || m.id !== monsters[index - 1].evolution);
let found = 0;
for (const monster of baseMonsters) {
  const areas = foundMonsters[monster.id];
  if (!areas || !areas.size) {
    console.log(`❌ #${monster.id} ${monster.name} ${chalk.red('not found')}`);
  } else {
    found++;
    console.log(`✅ #${monster.id} ${monster.name} ${chalk.green('found')} in ${chalk.blue([...areas].join(', '))}`);
  }
}

console.log(`Found ${found}/${baseMonsters.length} base monsters`);

for (const area in areaLevels) {
  const levels = areaLevels[area];
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  console.log(`${chalk.blue(area)} has monsters from level ${chalk.green(min)} to ${chalk.red(max)} (average ${chalk.yellow(avg.toFixed(1))})`);
}
