import {Injectable} from '@nestjs/common';
import {TALL_GRASS_TRAINER} from '../../constants';
import {EncounterService} from '../../encounter/encounter.service';
import {MonsterService} from '../../monster/monster.service';
import {OpponentService} from '../../opponent/opponent.service';
import {Trainer} from '../../trainer/trainer.schema';
import {MonsterGeneratorService} from '../monster-generator/monster-generator.service';

@Injectable()
export class BattleSetupService {
  constructor(
    private encounterService: EncounterService,
    private opponentService: OpponentService,
    private monsterService: MonsterService,
    private monsterGeneratorService: MonsterGeneratorService,
  ) {
  }

  async createTrainerBattle(defender: Trainer, attackers: Trainer[]) {
    const defenderId = defender._id.toString();
    const attackerIds = attackers.map(a => a._id.toString());
    const existingOpponents = await this.getOpponents([defenderId, ...attackerIds]);
    if (existingOpponents.length) {
      // one of the trainers is already in a battle
      if (existingOpponents[0].trainer === defenderId) {
        // the defender (or Trainer that is talked to) is already in a battle -- attacker joins
        return this.joinBattle(attackers[0], existingOpponents[0].encounter);
      }
      return;
    }

    const npcTrainerIds = [defender, ...attackers].filter(t => t.npc).map(t => t._id.toString());
    const monsters = await this.monsterService.findAll({
      trainer: {$in: [defenderId, ...attackerIds]},
      $or: [
        {'currentAttributes.health': {$gt: 0}},
        {trainer: {$in: npcTrainerIds}},
      ],
    });
    const defenderMonsters = defender.team.map(m => monsters.find(monster => monster._id.toString() === m)).filter(m => m);
    if (!defenderMonsters.length) {
      // the defender has no monsters left
      return;
    }

    if (!monsters.some(m => attackers.some(a => a.team.includes(m._id.toString())))) {
      // the attackers have no monsters left
      return;
    }

    await this.monsterService.healAll({
      trainer: {$in: npcTrainerIds},
    });

    const encounter = await this.encounterService.create({region: defender.region, isWild: false});

    const attackerOpponents = await Promise.all(attackers.map(attacker => {
      const attackerId = attacker._id.toString();
      const monster = attacker.team.map(m => monsters.find(monster => monster._id.equals(m))).find(m => m);
      if (!monster) {
        return;
      }
      return this.opponentService.createSimple(encounter._id.toString(), attackerId, {
        isAttacker: true,
        isNPC: !!attacker.npc,
        monster: monster._id.toString(),
      });
    }));

    for (const attackerOpponent of attackerOpponents) {
      if (!attackerOpponent) {
        continue;
      }

      const monster = defenderMonsters.shift();
      if (!monster) {
        break;
      }

      await this.opponentService.createSimple(encounter._id.toString(), defenderId, {
        isAttacker: false,
        isNPC: !!defender.npc,
        monster: monster._id.toString(),
      });
    }
  }

  async joinBattle(attacker: Trainer, encounter: string) {
    const allOpponents = await this.opponentService.findAll({encounter});
    if (allOpponents.length < 3) {
      return;
    }

    // 1v2 battles always put the single trainer on the defender side, so our "attacker" joins the defenders
    const defenders = allOpponents.filter(opponent => !opponent.isAttacker);
    if (!(defenders.length === 1 || defenders.length === 2 && defenders[0].trainer === defenders[1].trainer)) {
      // the battle is not 1v2
      return;
    }

    if (allOpponents.some(opponent => opponent.move || opponent.results.length || opponent.coins)) {
      // the battle has already started
      return;
    }

    const attackerMonster = await this.findMonster(attacker);
    if (!attackerMonster) {
      // the attacker has no monsters left
      return;
    }

    await this.opponentService.createSimple(encounter, attacker._id.toString(), {
      isAttacker: false,
      isNPC: !!attacker.npc,
      monster: attackerMonster._id.toString(),
    });
    // remove the defender's second opponent
    defenders[1] && await this.opponentService.delete(defenders[1]._id);
  }

  async createMonsterEncounter(defender: Trainer, type: number, level: number) {
    const defenderId = defender._id.toString();
    const existingOpponents = await this.getOpponents([defenderId]);
    if (existingOpponents.length) {
      // one of the trainers is already in a battle
      return;
    }

    const defenderMonster = await this.findMonster(defender);
    if (!defenderMonster) {
      return;
    }

    const encounter = await this.encounterService.create({region: defender.region, isWild: true});
    await this.opponentService.createSimple(encounter._id.toString(), defenderId, {
      isAttacker: false,
      isNPC: false,
      monster: defenderMonster._id.toString(),
    });
    const wildMonster = await this.monsterService.createSimple(TALL_GRASS_TRAINER, this.monsterGeneratorService.autofill(type, level));
    await this.opponentService.createSimple(encounter._id.toString(), TALL_GRASS_TRAINER, {
      isAttacker: true,
      isNPC: true,
      monster: wildMonster._id.toString(),
    });
  }

  private async findMonster(trainer: Trainer) {
    const monsters = await this.monsterService.findAll({
      trainer: trainer._id.toString(),
      'currentAttributes.health': {$gt: 0},
    });
    return trainer.team.map(m => monsters.find(monster => monster._id.toString() === m)).find(m => m);
  }

  private async getOpponents(trainers: string[]) {
    return this.opponentService.findAll({
      trainer: {$in: trainers},
    });
  }
}
