import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Types} from 'mongoose';
import {abilities, Ability, AttributeEffect, monsterTypes, TALL_GRASS_TRAINER, Type, types} from '../../constants';
import {EncounterService} from '../../encounter/encounter.service';
import {
  attackGain,
  defenseGain,
  EVOLUTION_LEVELS,
  expGain,
  expRequired,
  healthGain,
  relativeStrengthMultiplier,
  SAME_TYPE_ATTACK_MULTIPLIER,
  speedGain,
} from '../../formulae';
import {MAX_ABILITIES, MonsterAttributes, MonsterDocument} from '../../monster/monster.schema';
import {MonsterService} from '../../monster/monster.service';
import {Effectiveness, Opponent, OpponentDocument} from '../../opponent/opponent.schema';
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

      const targets = opponents.filter(o => o.isAttacker !== opponent.isAttacker && o.monster);
      const target = targets.random();
      const targetMonster = target.monster && await this.monsterService.findOne(target.monster);
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

        monster = this.findNPCnextMonster(liveMonsters, targetMonster || undefined);
        opponent.monster = monster._id.toString();
      }
      opponent.results = [];
      opponent.move = {
        type: 'ability',
        target: target.trainer,
        ability: targetMonster ? this.findNPCAbility(monster, targetMonster) : -1,
      };
    }
  }

  private findNPCAbility(attacker: MonsterDocument, target: MonsterDocument): number {
    const attackAbilities = Object.keys(attacker.abilities).map(ab => abilities.find(a => a.id.toString() === ab) as Ability);

    let chosenAbilityID = -1;
    let maxSum = -1;
    for (const ab of attackAbilities) {
      const attackUsesLeft = attacker.abilities[ab.id];
      if (attackUsesLeft <= 0) {
        continue;
      }

      const attackDamage = -(ab.effects.find((e): e is AttributeEffect => 'attribute' in e && e.attribute === 'health')?.amount || 0);
      if (!attackDamage) {
        // TODO support other effects
        continue;
      }

      const attackMultiplier = this.getAttackMultiplier(attacker, ab.type as Type, target);
      const attackSum = attackDamage * attackMultiplier;

      if (maxSum < attackSum) {
        maxSum = attackSum;
        chosenAbilityID = ab.id;
      }
    }

    return chosenAbilityID;
  }

  private findNPCnextMonster(liveMonster: MonsterDocument[], target?: MonsterDocument): MonsterDocument {
    let chosenMonster = liveMonster[0];
    let maxSum = -1;
    for (const monster of liveMonster) {
      const monsterLevel = monster.level;
      const types = monsterTypes.find(t => t.id === monster.type)?.type as Type[] || [];
      const monsterTypeMultiplier = target ? Math.max(1, ...types.map(t => this.getAttackMultiplier(monster, t, target))) : 1;
      const monsterSum = monsterLevel * monsterTypeMultiplier;

      if (maxSum < monsterSum || (maxSum === monsterSum && Math.random() > 0.5)) {
        chosenMonster = monster;
        maxSum = monsterSum;
      }
    }

    return chosenMonster;
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
      if (!move) {
        continue;
      }
      switch (move.type) {
        case 'ability':
          if (monster.currentAttributes.health <= 0) {
            opponent.results = [{type: 'monster-dead'}];
            continue;
          }

          if (!(move.ability in monster.abilities)) {
            opponent.results = [{type: 'ability-unknown', ability: move.ability}];
            continue;
          }
          const ability = abilities.find(a => a.id === move.ability);
          if (!ability) {
            opponent.results = [{type: 'ability-unknown'}];
            continue;
          }

          const targetMonster = monsters.find(m => m.trainer === move.target);
          const targetOpponent = opponents.find(o => o.trainer === move.target);
          if (!targetMonster || !targetOpponent) {
            opponent.results = [{type: 'target-unknown'}];
            continue;
          }

          if (targetMonster.currentAttributes.health <= 0) {
            opponent.results = [{type: 'target-dead'}];
            continue;
          }

          if (monster.abilities[move.ability] <= 0) {
            opponent.results = [{type: 'ability-no-uses', ability: move.ability}];
            continue;
          }

          this.playAbility(opponent, monster, ability, targetMonster, targetOpponent);
          break;
        case 'change-monster':
          opponent.results = [{type: 'monster-changed'}];
          break;
      }
    }

    await this.monsterService.saveMany(monsters);
  }

  private playAbility(currentOpponent: OpponentDocument, currentMonster: MonsterDocument, ability: Ability, targetMonster: MonsterDocument, targetOpponent: OpponentDocument) {
    const multiplier = this.getAttackMultiplier(currentMonster, ability.type as Type, targetMonster);

    for (const value of ability.effects) {
      if (value.chance == null || Math.random() <= value.chance) {
        if ('attribute' in value) {
          this.applyAttributeEffect(value, currentMonster, targetMonster, multiplier);
        }
      }
    }

    currentOpponent.results.push({
      type: 'ability-success', ability: ability.id,
      effectiveness: this.abilityEffectiveness(multiplier),
    });

    currentMonster.abilities[ability.id] -= 1;
    currentMonster.markModified('abilities');

    if (currentMonster.currentAttributes.health <= 0) {
      currentOpponent.results.push({type: 'monster-defeated'});
    } else if (targetMonster.currentAttributes.health <= 0) {
      currentOpponent.results.push({type: 'target-defeated'});
      targetOpponent.monster = undefined;
      if (!currentOpponent.isNPC) {
        this.gainExp(currentOpponent, currentMonster, targetMonster);
      }
    }
  }

  private getAttackMultiplier(attacker: MonsterDocument, abilityType: Type, defender: MonsterDocument) {
    const type = types[abilityType];

    let multiplier = 1;
    const targetTypes = (monsterTypes.find(m => m.id === defender.type)?.type || []) as Type[];
    for (const targetType of targetTypes) {
      multiplier *= type?.multipliers?.[targetType] || 1;
    }
    const currentTypes = (monsterTypes.find(m => m.id === attacker.type)?.type || []) as Type[];
    if (currentTypes.includes(abilityType)) {
      multiplier *= SAME_TYPE_ATTACK_MULTIPLIER;
    }
    return multiplier;
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

  private abilityEffectiveness(multiplier: number): Effectiveness {
    if (multiplier === 0) {
      return 'no-effect';
    } else if (multiplier >= 2) {
      return 'super-effective';
    } else if (multiplier > 1) {
      return 'effective';
    } else if (multiplier < 1) {
      return 'ineffective';
    } else {
      return 'normal';
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
    opponent.results.push({type: 'monster-levelup'});

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
        opponent.results.push({type: 'monster-evolved'});
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
      opponent.results.push({type: 'monster-learned', ability: ability.id});
      currentMonster.markModified('abilities');
    }
  }
}
