import {Injectable} from '@nestjs/common';
import {
  abilities as allAbilities,
  Ability,
  ATTRIBUTE_VALUES,
  EVOLUTION_LEVELS,
  MAX_ABILITIES,
  monsterTypes, Type, types
} from '../../constants';
import {CreateMonsterDto} from '../../monster/monster.dto';
import {MonsterAttributes, MonsterDocument} from '../../monster/monster.schema';
import {MonsterService} from '../../monster/monster.service';
import {notFound} from "@mean-stream/nestx";

@Injectable()
export class MonsterGeneratorService {
  constructor(
    private monsterService: MonsterService,
  ) {
  }

  autofill(type: number, level: number): CreateMonsterDto {
    let monsterType = monsterTypes.find(t => t.id === type) || notFound('Invalid monster type');
    for (const evolutionLevel of EVOLUTION_LEVELS) {
      if (level >= evolutionLevel && monsterType.evolution) {
        type = monsterType.evolution;
        monsterType = monsterTypes.find(t => t.id === type) || monsterType;
      }
    }

    const abilities = this.findBestAbilities(this.getPossibleAbilities(level, monsterType.type));
    return {
      type,
      level,
      attributes: Object.fromEntries(Object.entries(ATTRIBUTE_VALUES).map(([attr, {base, levelUp: [min, max]}]) => {
        const attribute = attr as keyof MonsterAttributes;
        let value = base + level * (min + max) / 2;
        for (const type of monsterType.type) {
          value *= types[type as Type].attributeMultipliers[attribute];
        }
        value = Math.round(value);
        return [attribute, value] as const;
      })) as any,
      abilities: Object.fromEntries(abilities.map(a => [a.id, a.maxUses])),
    };
  }

  getPossibleAbilities(level: number, types: string[]) {
    // filter by minLevel and type (normal or one of monster types)
    return allAbilities.filter(a => level >= a.minLevel && (a.type === 'normal' || types.includes(a.type)));
  }

  findBestAbilities(abilities: Ability[]) {
    return abilities
      // bring some randomness
      .shuffle()
      // sort by minLevel descending - we want the best abilities
      .sort((a, b) => b.minLevel - a.minLevel)
      // take the best
      .slice(0, MAX_ABILITIES);
  }

  async createAuto(trainer: string, type: number, level: number): Promise<MonsterDocument> {
    const dto = this.autofill(type, level);
    return this.monsterService.upsert({
      // NB: This makes it so NPCs cannot have two monsters of the same type and level.
      trainer,
      level,
      // NB: Use the potentially evolved type
      type: dto.type,
    }, {
      $setOnInsert: {
        ...dto,
        trainer,
        experience: 0,
        currentAttributes: dto.attributes,
      },
    });
  }

}
