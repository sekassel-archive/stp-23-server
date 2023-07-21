import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Types} from 'mongoose';
import {
  abilities,
  Ability,
  AttributeEffect,
  MAX_ABILITIES,
  MonsterStatus,
  monsterTypes,
  TALL_GRASS_TRAINER,
  Type,
  types,
} from '../../constants';
import {EncounterService} from '../../encounter/encounter.service';
import {
  abilityStatusScore,
  attackGain,
  coinsGain,
  defenseGain,
  EVOLUTION_LEVELS,
  expGain,
  expRequired,
  healthGain,
  relativeStrengthMultiplier,
  SAME_TYPE_ATTACK_MULTIPLIER,
  speedGain, STATUS_ABILITY_CHANCE,
  STATUS_DAMAGE,
  STATUS_FAIL_CHANCE,
  STATUS_REMOVE_CHANCE,
} from '../../formulae';
import {ItemService} from '../../item/item.service';
import {MonsterAttributes, MonsterDocument} from '../../monster/monster.schema';
import {MonsterService} from '../../monster/monster.service';
import {Effectiveness, Opponent, OpponentDocument} from '../../opponent/opponent.schema';
import {OpponentService} from '../../opponent/opponent.service';
import {MonsterGeneratorService} from '../monster-generator/monster-generator.service';
import {TrainerService} from "../../trainer/trainer.service";

@Injectable()
export class BattleService {
  constructor(
    private encounterService: EncounterService,
    private opponentService: OpponentService,
    private trainerService: TrainerService,
    private monsterService: MonsterService,
    private monsterGeneratorService: MonsterGeneratorService,
    private itemService: ItemService,
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
    await this.opponentService.saveAll(opponents);

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
      if (!opponent.monster && opponent.isNPC) {
        opponent.monster = (await this.findNPCnextMonster(opponent.trainer))?._id.toString();
      }
    }
    await this.opponentService.saveAll(opponents);

    // remove opponents without monsters
    const monsters = await this.monsterService.findAll({
      trainer: {$in: opponents.map(o => o.trainer)},
      'currentAttributes.health': {$gt: 0},
    });
    const teams = (await this.trainerService.findAll({
      _id: {$in: opponents.map(o => new Types.ObjectId(o.trainer))},
    }, {projection: {team: 1}})).flatMap(t => t.team);
    const neededMonsters = new Set();
    const deleteOpponents = opponents.filter(opponent => {
      if (opponent.trainer === TALL_GRASS_TRAINER) {
        const monster = monsters.find(m => m._id.toString() === opponent.monster);
        return !monster || monster.trainer !== TALL_GRASS_TRAINER; // monster was caught
      }

      const monster = monsters.find(m =>
        m.trainer === opponent.trainer
        && !neededMonsters.has(m._id.toString())
        && teams.includes(m._id.toString())
      );
      if (!monster) {
        return true;
      }

      neededMonsters.add(monster._id.toString());
      return false;
    });
    await this.opponentService.deleteMany({_id: {$in: deleteOpponents.map(o => o._id)}});

    const playerIds = opponents.filter(o => !o.isNPC && !deleteOpponents.includes(o)).map(o => o.trainer);
    // defeated opponents remember the players they encountered
    deleteOpponents.length && await this.trainerService.updateMany({
      _id: {$in: deleteOpponents.map(o => new Types.ObjectId(o.trainer))},
      npc: {$exists: true},
    }, {
      $addToSet: {
        'npc.encountered': {$each: playerIds},
      },
    });
  }

  private async makeNPCMoves(opponents: OpponentDocument[]) {
    for (const opponent of opponents) {
      if (!opponent.isNPC || opponent.move) {
        continue;
      }

      const targets = opponents.filter(o => o.isAttacker !== opponent.isAttacker && o.monster);
      const target = targets.random();
      const targetMonster = target.monster && await this.monsterService.find(new Types.ObjectId(target.monster));
      let monster = opponent.monster && await this.monsterService.find(new Types.ObjectId(opponent.monster));
      if (!monster || monster.currentAttributes.health <= 0) {
        monster = await this.findNPCnextMonster(opponent.trainer, targetMonster || undefined);
        opponent.monster = monster?._id.toString();
      }
      opponent.results = [];
      opponent.move = monster && targetMonster ? {
        type: 'ability',
        target: target._id.toString(),
        ability: this.findNPCAbility(monster, targetMonster),
      } : undefined;
    }
  }

  private findNPCAbility(attacker: MonsterDocument, target: MonsterDocument): number {
    const attackAbilities = Object.keys(attacker.abilities).map(ab => abilities.find(a => a.id.toString() === ab) as Ability);

    let chosenAttackAbilityID = -1;
    let chosenEffectAbilityID = -1;
    let maxAttackSum = -1;
    let maxEffectSum = -1;

    for (const ab of attackAbilities) {
      const attackUsesLeft = attacker.abilities[ab.id];
      if (attackUsesLeft <= 0) {
        continue;
      }

      const attackMultiplier = this.getAttackMultiplier(attacker, ab.type as Type, target);
      const attackDamage = -(ab.effects.find((e): e is AttributeEffect => 'attribute' in e && e.attribute === 'health')?.amount || 0);
      if (!attackDamage) {
        const effectSum = abilityStatusScore(attacker.status, ab) * attackMultiplier;

        if (maxEffectSum < effectSum) {
          maxEffectSum = effectSum;
          chosenEffectAbilityID = ab.id;
        }
        continue;
      }

      const attackSum = attackDamage * attackMultiplier;

      if (maxAttackSum < attackSum) {
        maxAttackSum = attackSum;
        chosenAttackAbilityID = ab.id;
      }
    }

    return chosenEffectAbilityID !== -1 && Math.random() < STATUS_ABILITY_CHANCE ? chosenEffectAbilityID : chosenAttackAbilityID;
  }

  private async findNPCnextMonster(trainer: string, target?: MonsterDocument): Promise<MonsterDocument | undefined> {
    if (trainer === TALL_GRASS_TRAINER) {
      return;
    }

    const liveMonsters = await this.monsterService.findAll({
      trainer,
      // NB: no check for Trainer.team, because NPCs usually don't have that many monsters
      'currentAttributes.health': {$gt: 0},
    });
    if (!liveMonsters.length) {
      return;
    }

    let chosenMonster = liveMonsters[0];
    let maxSum = -1;
    for (const monster of liveMonsters) {
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
      opponent && await this.playMove(monster, opponent, opponents, monsters);
      this.removeStatusEffects(monster, opponent);
      this.applyStatusDamage(monster, opponent);
    }

    await this.monsterService.saveAll(monsters);
  }

  private async playMove(monster: MonsterDocument, opponent: OpponentDocument, opponents: OpponentDocument[], monsters: MonsterDocument[]) {
    const move = opponent.move;
    if (!move) {
      return;
    }
    switch (move.type) {
      case 'ability':
        const monsterId = monster._id.toString();
        if (monster.currentAttributes.health <= 0) {
          opponent.results = [{type: 'monster-dead', monster: monsterId}];
          return;
        }

        for (const status of monster.status) {
          const failChance = STATUS_FAIL_CHANCE[status];
          if (failChance && Math.random() < failChance) {
            opponent.results = [{type: 'ability-failed', status, monster: monsterId}];
            return;
          }
        }

        if (!(move.ability in monster.abilities)) {
          opponent.results = [{type: 'ability-unknown', ability: move.ability, monster: monsterId}];
          return;
        }
        const ability = abilities.find(a => a.id === move.ability);
        if (!ability) {
          opponent.results = [{type: 'ability-unknown', monster: monsterId}];
          return;
        }

        const targetOpponent = opponents.find(o => o._id.equals(move.target) || o.trainer === move.target);
        const targetMonsterId = targetOpponent?.monster;
        const targetMonster = targetMonsterId && monsters.find(m => m._id.equals(targetMonsterId));
        if (!targetOpponent || !targetMonster) {
          opponent.results = [{type: 'target-unknown', monster: targetMonsterId || move.target}];
          return;
        }

        if (targetMonster.currentAttributes.health <= 0) {
          opponent.results = [{type: 'target-dead', monster: targetMonsterId}];
          return;
        }

        if (monster.abilities[move.ability] <= 0) {
          opponent.results = [{type: 'ability-no-uses', ability: move.ability, monster: monsterId}];
          return;
        }

        this.playAbility(opponent, monster, ability, targetMonster, targetOpponent);
        break;
      case 'change-monster':
        opponent.results = [{type: 'monster-changed', monster: move.monster}];
        break;
      case 'use-item':
        const monsterInBattle = monsters.find(m => m._id.equals(move.target));
        const trainerMonster = monsterInBattle ? undefined : await this.monsterService.find(new Types.ObjectId(move.target));
        try {
          const prefTrainer = monsterInBattle?.trainer;
          await this.itemService.useItem(opponent.trainer, move.item, monsterInBattle || trainerMonster);
          if (trainerMonster) {
            await this.monsterService.saveAll([trainerMonster]);
          }
          opponent.results.push({
            type: monsterInBattle?.trainer !== prefTrainer ? 'monster-caught' : 'item-success',
            item: move.item,
            monster: move.target,
          });
        } catch (err) {
          opponent.results = [{type: 'item-failed', item: move.item, monster: move.target}];
        }
    }
  }

  private playAbility(currentOpponent: OpponentDocument, currentMonster: MonsterDocument, ability: Ability, targetMonster: MonsterDocument, targetOpponent: OpponentDocument) {
    const multiplier = this.getAttackMultiplier(currentMonster, ability.type as Type, targetMonster);

    for (const value of ability.effects) {
      if (value.chance == null || Math.random() <= value.chance) {
        if ('attribute' in value) {
          this.applyAttributeEffect(value, currentMonster, targetMonster, multiplier);
        } else if ('status' in value) {
          const monster = value.self === true ? currentMonster : targetMonster;
          const result = this.monsterService.applyStatusEffect(value, monster);
          if (result !== 'unchanged') {
            const opponent = value.self === true ? currentOpponent : targetOpponent;
            opponent.results.push({
              type: `status-${result}`,
              status: value.status as MonsterStatus,
              monster: monster._id.toString()
            });
          }
        }
      }
    }

    currentOpponent.results.push({
      type: 'ability-success', ability: ability.id,
      effectiveness: this.abilityEffectiveness(multiplier),
      monster: currentMonster._id.toString(),
    });

    currentMonster.abilities[ability.id] -= 1;
    currentMonster.markModified('abilities');

    if (currentMonster.currentAttributes.health <= 0) {
      currentOpponent.results.push({type: 'monster-defeated', monster: currentMonster._id.toString()});
      currentOpponent.monster = undefined;
    } else if (targetMonster.currentAttributes.health <= 0) {
      currentOpponent.results.push({type: 'target-defeated', monster: targetMonster._id.toString()});
      targetOpponent.monster = undefined;
      if (!currentOpponent.isNPC) {
        this.gainExp(currentOpponent, currentMonster, targetMonster);
        if (targetMonster.trainer !== TALL_GRASS_TRAINER) {
          currentOpponent.$inc('coins', coinsGain(targetMonster.level));
        }
      }
    }
  }

  private removeStatusEffects(monster: MonsterDocument, opponent?: OpponentDocument) {
    monster.status = monster.status.filter(status => {
      if (Math.random() < STATUS_REMOVE_CHANCE) {
        opponent && opponent.results.push({type: 'status-removed', status, monster: monster._id.toString()});
        return false;
      }
      return true;
    });
  }

  private applyStatusDamage(monster: MonsterDocument, opponent?: OpponentDocument) {
    if (monster.currentAttributes.health <= 1) {
      // status damage can't kill a monster
      return;
    }

    for (const status of monster.status) {
      const damage = STATUS_DAMAGE[status];
      if (!damage) {
        continue;
      }

      const [amount, type] = damage;
      const multiplier = this.getAttackMultiplier(undefined, type, monster);
      monster.currentAttributes.health -= amount * multiplier;
      opponent && opponent.results.push({
        type: 'status-damage',
        status,
        effectiveness: this.abilityEffectiveness(multiplier),
        monster: monster._id.toString(),
      });
    }
    if (monster.currentAttributes.health < 1) {
      monster.currentAttributes.health = 1;
    }
  }

  private getAttackMultiplier(attacker: MonsterDocument | undefined, abilityType: Type, defender: MonsterDocument) {
    const type = types[abilityType];

    let multiplier = 1;
    const targetTypes = (monsterTypes.find(m => m.id === defender.type)?.type || []) as Type[];
    for (const targetType of targetTypes) {
      multiplier *= type?.multipliers?.[targetType] || 1;
    }
    if (attacker) {
      const currentTypes = (monsterTypes.find(m => m.id === attacker.type)?.type || []) as Type[];
      if (currentTypes.includes(abilityType)) {
        multiplier *= SAME_TYPE_ATTACK_MULTIPLIER;
      }
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
    const monsterId = currentMonster._id.toString();
    opponent.results.push({type: 'monster-levelup', monster: monsterId});

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
        opponent.results.push({type: 'monster-evolved', monster: monsterId});
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
      opponent.results.push({type: 'monster-learned', ability: ability.id, monster: monsterId});
      currentMonster.markModified('abilities');
    }
  }
}
