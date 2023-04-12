const fs = require('fs');

const original = JSON.parse(fs.readFileSync('monsters.json').toString());
const descriptions = fs.readFileSync('descriptions.txt').toString().split('\n').filter(s => s);
const descriptionMap = new Map(descriptions.map(line => {
  const [name, description] = line.split(':');
  return [name.trim(), description.trim()];
}));

const monsters = original.map(monster => {
  const description = descriptionMap.get(monster.name);
  if (description) {
    monster.description = description;
  }
  return monster;
});

fs.writeFileSync('monsters.json', JSON.stringify(monsters));
