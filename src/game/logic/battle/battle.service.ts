import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Types} from 'mongoose';
import {
  abilities,
  Ability,
  AttributeEffect,
  monsterTypes,
  Result,
  TALL_GRASS_TRAINER,
  Type,
  types,
} from '../../constants';
import {EncounterService} from '../../encounter/encounter.service';
import {
  attackGain,
  defenseGain,
  EVOLUTION_LEVELS,
  expGain,
  expRequired,
  healthGain, relativeStrengthMultiplier,
  SAME_TYPE_ATTACK_MULTIPLIER,
  speedGain,
} from '../../formulae';
import {MAX_ABILITIES, MonsterAttributes, MonsterDocument} from '../../monster/monster.schema';
import {MonsterService} from '../../monster/monster.service';
import {Move, Opponent, OpponentDocument} from '../../opponent/opponent.schema';
import {OpponentService} from '../../opponent/opponent.service';
import {MonsterGeneratorService} from '../monster-generator/monster-generator.service';

@Injectable()
export class BattleService {
  constructor(
    private encounterService: EncounterService,
    private opponentService: OpponentService,
    private monsterService: MonsterService,
    private monsterGeneratorService: MonsterGeneratorService,
  ) {
  }

  @OnEvent('encounters.*.opponents.*.updated')
  async onOpponentUpdated(opponent: Opponent): Promise<void> {
    if (opponent.isNPC) {
      return;
    }

    // check if all player opponents have made a move

    const opponents = await this.opponentService.findAll({encounter: opponent.encounter.toString()});
    if (!opponents.every(t => t.isNPC || t.move)) {
      // not all players have made a move
      return;
    }

    await this.makeNPCMoves(opponents);
    // notify players about NPC moves
    await this.opponentService.saveMany(opponents);

    // clear results and play round
    // NB: clearing results has to happen after notifying players about NPC moves,
    //     otherwise this method will be called again
    for (const opponent of opponents) {
      opponent.results = [];
    }
    await this.playRound(opponents);

    // clear moves
    for (const opponent of opponents) {
      opponent.move = undefined;
    }
    await this.opponentService.saveMany(opponents);

    // remove opponents without monsters
    const monsters = await this.monsterService.findAll({
      trainer: {$in: opponents.map(o => o.trainer)},
      'currentAttributes.health': {$gt: 0},
    });
    const deleteOpponents: Types.ObjectId[] = [];
    for (const opponent of opponents) {
      if (opponent.trainer === TALL_GRASS_TRAINER) {
        if (!monsters.find(m => m._id.toString() === opponent.monster)) {
          deleteOpponents.push(opponent._id!);
        }
      } else if (!monsters.find(m => m.trainer === opponent.trainer)) {
        deleteOpponents.push(opponent._id!);
      }
    }
    await this.opponentService.deleteAll({_id: {$in: deleteOpponents}});
  }

  private async makeNPCMoves(opponents: OpponentDocument[]) {
    for (const opponent of opponents) {
      if (!opponent.isNPC || opponent.move) {
        continue;
      }

      const targets = opponents.filter(o => o.isAttacker !== opponent.isAttacker);
      const target = targets.random();
      let monster = opponent.monster && await this.monsterService.findOne(opponent.monster);
      if (!monster || monster.currentAttributes.health <= 0) {
        if (opponent.trainer === TALL_GRASS_TRAINER) {
          continue;
        }
        const liveMonsters = await this.monsterService.findAll({
          trainer: opponent.trainer,
          'currentAttributes.health': {$gt: 0},
        });
        if (!liveMonsters.length) {
          continue;
        }
        // TODO select monster based on type
        monster = liveMonsters.random();
        opponent.monster = monster._id.toString();
      }
      opponent.move = {
        type: 'ability',
        target: target.trainer,
        // TODO select ability based on monster type
        ability: +Object.keys(monster.abilities).random(),
      };
    }
  }

  async playRound(opponents: OpponentDocument[]): Promise<void> {
    if (opponents.find(o => !o.move)) {
      return;
    }

    const monsterIds = opponents.filter(o => o.monster).map(o => new Types.ObjectId(o.monster));
    const monsters = await this.monsterService.findAll({_id: {$in: monsterIds}});

    monsters.sort((a, b) => a.attributes.speed - b.attributes.speed);

    for (const monster of monsters) {
      const opponent = opponents.find(o => o.monster === monster._id.toString());
      const move = opponent?.move;
      if (move && move.type === 'ability') {
        if (monster.currentAttributes.health <= 0) {
          opponent.results = ['monster-dead'];
          continue;
        }

        if (!(move.ability in monster.abilities)) {
          opponent.results = ['ability-unknown'];
          continue;
        }
        const ability = abilities.find(a => a.id === move.ability);
        if (!ability) {
          opponent.results = ['ability-unknown'];
          continue;
        }

        const targetMonster = monsters.find(m => m.trainer === move.target);
        const targetOpponent = opponents.find(o => o.trainer === move.target);
        if (!targetMonster || !targetOpponent) {
          opponent.results = ['target-unknown'];
          continue;
        }

        if (targetMonster.currentAttributes.health <= 0) {
          opponent.results = ['target-dead'];
          continue;
        }

        if (monster.abilities[move.ability] <= 0) {
          opponent.results = ['ability-no-uses'];
          continue;
        }

        this.playAbility(opponent, monster, ability, targetMonster, targetOpponent);
      }
    }

    await this.monsterService.saveMany(monsters);
  }

  private playAbility(currentOpponent: OpponentDocument, currentMonster: MonsterDocument, ability: Ability, targetMonster: MonsterDocument, targetOpponent: OpponentDocument) {
    const abilityType = ability.type as Type;
    const type = types[abilityType];
    let multiplier = 1;
    const targetTypes = (monsterTypes.find(m => m.id === targetMonster.type)?.type || []) as Type[];
    for (const targetType of targetTypes) {
      multiplier *= type?.multipliers?.[targetType] || 1;
    }
    const currentTypes = (monsterTypes.find(m => m.id === currentMonster.type)?.type || []) as Type[];
    if (currentTypes.includes(abilityType)) {
      multiplier *= SAME_TYPE_ATTACK_MULTIPLIER;
    }

    for (const value of ability.effects) {
      if (value.chance == null || Math.random() <= value.chance) {
        if ('attribute' in value) {
          this.applyAttributeEffect(value, currentMonster, targetMonster, multiplier);
        }
      }
    }

    currentOpponent.results.push(this.abilityResult(multiplier));

    currentMonster.abilities[ability.id] -= 1;
    currentMonster.markModified('abilities');

    if (currentMonster.currentAttributes.health <= 0) {
      currentOpponent.results.push('monster-defeated');
    } else if (targetMonster.currentAttributes.health <= 0) {
      currentOpponent.results.push('target-defeated');
      targetOpponent.monster = undefined;
      if (!currentOpponent.isNPC) {
        this.gainExp(currentOpponent, currentMonster, targetMonster);
      }
    }
  }

  private applyAttributeEffect(value: AttributeEffect, currentMonster: MonsterDocument, targetMonster: MonsterDocument, multiplier: number) {
    const effectTarget = (value.self === true || (value.self == null && value.amount > 0)) ? currentMonster : targetMonster;
    const attribute = value.attribute as keyof MonsterAttributes;
    let effectAmount: number = value.amount;

    if (attribute === 'health' && effectAmount < 0) {
      effectAmount *= multiplier * relativeStrengthMultiplier(currentMonster, targetMonster);
    }

    effectTarget.currentAttributes[attribute] += effectAmount;
    if (effectTarget.currentAttributes[attribute] <= 0) {
      effectTarget.currentAttributes[attribute] = 0;
    }
    effectTarget.markModified(`currentAttributes.${attribute}`);
  }

  private abilityResult(multiplier: number): Result {
    if (multiplier === 0) {
      return 'ability-no-effect';
    } else if (multiplier >= 2) {
      return 'ability-super-effective';
    } else if (multiplier > 1) {
      return 'ability-effective';
    } else if (multiplier < 1) {
      return 'ability-ineffective';
    } else {
      return 'ability-normal';
    }
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
    const health = healthGain(currentMonster.level);
    const attack = attackGain(currentMonster.level);
    const defense = defenseGain(currentMonster.level);
    const speed = speedGain(currentMonster.level);
    currentMonster.attributes.health += health;
    currentMonster.attributes.attack += attack;
    currentMonster.attributes.defense += defense;
    currentMonster.attributes.speed += speed;
    currentMonster.currentAttributes.health += health;
    currentMonster.currentAttributes.attack += attack;
    currentMonster.currentAttributes.defense += defense;
    currentMonster.currentAttributes.speed += speed;
    currentMonster.markModified('attributes');
    currentMonster.markModified('currentAttributes');

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
    const newAbilities = this.monsterGeneratorService.getPossibleAbilities(currentMonster.level, monsterType.type)
      .filter(a => !(a.id in currentMonster.abilities));
    if (newAbilities.length) {
      const ability = newAbilities.random();
      currentMonster.abilities[ability.id] = ability.maxUses;
      const keys = Object.keys(currentMonster.abilities);
      while (keys.length > MAX_ABILITIES) {
        const removed = keys.shift();
        removed && delete currentMonster.abilities[+removed];
      }
      opponent.results.push('monster-learned');
      currentMonster.markModified('abilities');
    }
  }
}
