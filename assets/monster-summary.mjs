const region = 'Albertania';
import * as fs from 'node:fs/promises';
import chalk from 'chalk';

const foundMonsters = {};
const areaLevels = {};
const areaMonsters = {};

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
      if (monstersProp) try {
        const monsters = JSON.parse(monstersProp);
        for (const [type, level, maxLevel] of monsters) {
          (foundMonsters[type] ||= new Set).add(area);
          if (object.type === 'TallGrass') {
            (areaMonsters[area] ||= new Set).add(type);
          }
          (areaLevels[area] ||= []).push(level);
          for (let i = level + 1; i <= maxLevel; i++) {
            (areaLevels[area] ||= []).push(i);
          }
        }
      } catch (e) {
        console.error(`Error parsing monsters for ${area} object ${object.id} '${object.name}'`, e);
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

const monsters = JSON.parse(await fs.readFile('monsters.json', 'utf8'));

for (let i = 1; i < monsters.length; i++) {
  const m = monsters[i];
  if (m.id !== monsters[i - 1].evolution && (m.image.endsWith('_2.png') || m.image.endsWith('_3.png'))) {
    console.log(`❌ #${m.id} ${m.name} ${chalk.red('cannot be evolved to')}`);
  }
}

const baseMonsters = monsters.filter((m, index) => index === 0 || m.id !== monsters[index - 1].evolution && !m.legendary);
let found = 0;
for (const monster of baseMonsters) {
  const areas = foundMonsters[monster.id];
  if (!areas || !areas.size) {
    console.log(`❌ #${monster.id} ${monster.name} ${chalk.red('not found')}`);
  } else {
    found++;
    const rarity = {
      1: '🥇',
      2: '🥈',
      3: '🥉',
    }
    console.log(`✅ #${monster.id} ${monster.name} in ${chalk.green(areas.size)} areas ${rarity[areas.size] || ''}`);
  }
}

console.log(`Found ${found}/${baseMonsters.length} base monsters`);

for (const area in areaLevels) {
  const levels = areaLevels[area];
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  console.log(`${chalk.blue(area)} has level ${chalk.green(min)} to ${chalk.red(max)} (avg. ${chalk.yellow(avg.toFixed(1))})`);
}

const map = JSON.parse(await fs.readFile(`maps/${region}.json`, 'utf8'));
let changed = false;
for (const layer of map.layers) {
  if (layer.type !== 'objectgroup') {
    continue;
  }

  for (const object of layer.objects) {
    const areaMonster = areaMonsters[object.name];
    if (!areaMonster) {
      continue;
    }

    const properties = object.properties ||= [];
    let monsters = properties.find(p => p.name === 'Monsters');
    if (!monsters) {
      monsters = { name: 'Monsters', type: 'string', value: '[]' };
      properties.push(monsters);
    }

    const newValue = JSON.stringify([...areaMonster]);
    if (monsters.value !== newValue) {
      changed = true;
    }
    monsters.value = newValue;
  }
}

if (changed) {
  await fs.writeFile(`maps/${region}.json`, JSON.stringify(map, null, 2));
}
