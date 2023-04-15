import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model, Types} from 'mongoose';
import {EventService} from '../../event/event.service';
import {abilities, Ability, AttributeEffect, monsterTypes, Type, types} from '../constants';
import {attackGain, defenseGain, EVOLUTION_LEVELS, expGain, expRequired, healthGain, speedGain} from '../formulae';
import {MAX_ABILITIES, MonsterAttributes, MonsterDocument} from '../monster/monster.schema';
import {MonsterService} from '../monster/monster.service';
import {OpponentDocument} from '../opponent/opponent.schema';
import {OpponentService} from '../opponent/opponent.service';
import {CreateEncounterDto} from './encounter.dto';
import {Encounter, EncounterDocument} from './encounter.schema';

@Injectable()
export class EncounterService {
  constructor(
    private monsterService: MonsterService,
    private opponentService: OpponentService,
    private eventService: EventService,
    @InjectModel(Encounter.name) private model: Model<Encounter>,
  ) {
  }

  async findAll(region: string): Promise<EncounterDocument[]> {
    return this.model.find({region}).exec();
  }

  async findOne(id: string): Promise<EncounterDocument | null> {
    return this.model.findById(id).exec();
  }

  async create(region: string, dto: CreateEncounterDto): Promise<EncounterDocument> {
    const encounter = await this.model.create({
      ...dto,
      region,
    });
    encounter && this.emit('create', encounter);
    return encounter;
  }

  private emit(event: string, encounter: Encounter) {
    this.eventService.emit(`regions.${encounter.region}.encounters.${encounter._id.toString()}.${event}`, encounter);
  }

  async playRound(opponents: OpponentDocument[]): Promise<void> {
    if (opponents.find(o => !o.move)) {
      return;
    }

    const monsters = await this.monsterService.findAll({_id: {$in: opponents.map(o => new Types.ObjectId(o.monster))}});

    monsters.sort((a, b) => a.attributes.speed - b.attributes.speed);

    for (const monster of monsters) {
      const opponent = opponents.find(o => o.monster === monster._id.toString());
      const move = opponent?.move;
      if (move && move.type === 'ability') {
        if (monster.currentAttributes.health <= 0) {
          opponent.results = ['monster-dead'];
          continue;
        }

        if (!monster.abilities.includes(move.ability)) {
          opponent.results = ['ability-unknown'];
          continue;
        }
        const ability = abilities.find(a => a.id === move.ability);
        if (!ability) {
          opponent.results = ['ability-unknown'];
          continue;
        }

        const target = monsters.find(m => m.trainer === move.target);
        if (!target) {
          opponent.results = ['target-unknown'];
          continue;
        }

        if (target.currentAttributes.health <= 0) {
          opponent.results = ['target-dead'];
          continue;
        }

        this.playAbility(opponent, ability, monster, target);
      }
    }

    await this.monsterService.saveMany(monsters);
  }

  private playAbility(opponent: OpponentDocument, ability: Ability, currentMonster: MonsterDocument, targetMonster: MonsterDocument) {
    const targetTypes = (monsterTypes.find(m => m.id === targetMonster.type)?.type || []) as Type[];
    let multiplier = 1;
    for (const targetType of targetTypes) {
      const abilityType = ability.type as Type;
      const type = types[abilityType];
      multiplier *= type?.multipliers?.[targetType] || 1;
    }

    for (const value of ability.effects) {
      if (value.chance == null || Math.random() <= value.chance) {
        if ('attribute' in value) {
          this.applyAttributeEffect(value, currentMonster, targetMonster, multiplier);
        }
      }
    }

    if (multiplier > 1) {
      opponent.results.push('ability-effective');
    } else if (multiplier < 1) {
      opponent.results.push('ability-ineffective');
    }

    if (currentMonster.currentAttributes.health <= 0) {
      opponent.results.push('monster-defeated');
    } else if (targetMonster.currentAttributes.health <= 0) {
      opponent.results.push('target-defeated');
      this.gainExp(opponent, currentMonster, targetMonster);
    }
  }

  private applyAttributeEffect(value: AttributeEffect, currentMonster: MonsterDocument, targetMonster: MonsterDocument, multiplier: number) {
    const effectTarget = (value.self === true || (value.self == null && value.amount > 0)) ? currentMonster : targetMonster;
    const attribute = value.attribute as keyof MonsterAttributes;
    let effectAmount: number = value.amount;

    if (attribute === 'health' && effectAmount < 0) {
      effectAmount -= currentMonster.currentAttributes.attack;
      effectAmount += targetMonster.currentAttributes.defense;

      if (effectAmount > 0) {
        effectAmount = 0;
      }

      effectAmount *= multiplier;
    }

    effectTarget.currentAttributes[attribute] += effectAmount;
    if (effectTarget.currentAttributes[attribute] <= 0) {
      effectTarget.currentAttributes[attribute] = 0;
    }
    effectTarget.markModified(`currentAttributes.${attribute}`);
  }

  private gainExp(opponent: OpponentDocument, currentMonster: MonsterDocument, effectTarget: MonsterDocument) {
    // TODO improve experience gain
    currentMonster.experience += expGain(effectTarget.level);

    while (true) {
      const levelUpExp = expRequired(currentMonster.level);
      if (currentMonster.experience >= levelUpExp) {
        currentMonster.experience -= levelUpExp;
        this.levelUp(opponent, currentMonster);
      } else {
        break;
      }
    }
  }

  private levelUp(opponent: OpponentDocument, currentMonster: MonsterDocument) {
    opponent.results.push('monster-levelup');

    currentMonster.level++;
    currentMonster.attributes.health += healthGain(currentMonster.level);
    currentMonster.attributes.attack += attackGain(currentMonster.level);
    currentMonster.attributes.defense += defenseGain(currentMonster.level);
    currentMonster.attributes.speed += speedGain(currentMonster.level);
    currentMonster.markModified('attributes');

    let monsterType = monsterTypes.find(m => m.id === currentMonster.type);
    if (!monsterType) {
      console.error(`Monster ${currentMonster._id} has unknown type ${currentMonster.type}!`);
      return;
    }

    // Evolution
    if (EVOLUTION_LEVELS.includes(currentMonster.level)) {
      const evolution = monsterType.evolution;
      const newMonsterType = monsterTypes.find(m => m.id === evolution);
      if (evolution && newMonsterType) {
        opponent.results.push('monster-evolved');
        currentMonster.type = evolution;
        monsterType = newMonsterType;
      }
    }

    // Learn new ability
    const newAbilities = this.monsterService.getPossibleAbilities(currentMonster.level, monsterType.type)
      .filter(a => !currentMonster.abilities.includes(a.id));
    if (newAbilities.length) {
      const ability = newAbilities.random();
      currentMonster.abilities.push(ability.id);
      while (currentMonster.abilities.length > MAX_ABILITIES) {
        currentMonster.abilities.shift();
      }
      opponent.results.push('monster-learned');
      currentMonster.markModified('abilities');
    }
  }
}
