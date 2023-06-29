import {Injectable} from '@nestjs/common';
import {TALL_GRASS_TRAINER} from '../../constants';
import {EncounterService} from '../../encounter/encounter.service';
import {MonsterService} from '../../monster/monster.service';
import {OpponentService} from '../../opponent/opponent.service';
import {Trainer} from '../../trainer/trainer.schema';
import {MonsterGeneratorService} from '../monster-generator/monster-generator.service';
import {Encounter} from "../../encounter/encounter.schema";

@Injectable()
export class BattleSetupService {
  constructor(
    private encounterService: EncounterService,
    private opponentService: OpponentService,
    private monsterService: MonsterService,
    private monsterGeneratorService: MonsterGeneratorService,
  ) {
  }

  async createTrainerBattle(defender: Trainer, attackers: Trainer[]): Promise<'in-battle' | 'defender-not-ready' | 'attackers-not-ready' | Encounter> {
    const defenderId = defender._id.toString();
    const attackerIds = attackers.map(a => a._id.toString());
    const isOpponentInBattle = await this.isInBattle([defenderId, ...attackerIds]);
    if (isOpponentInBattle) {
      // one of the trainers is already in a battle
      return 'in-battle';
    }

    await this.monsterService.healAll({
      trainer: {$in: [defender, ...attackers].filter(t => t.npc).map(t => t._id.toString())},
    });

    const monsters = await this.monsterService.findAll({
      trainer: {$in: [defenderId, ...attackerIds]},
      'currentAttributes.health': {$gt: 0},
    });
    const defenderMonster = defender.team.flatMap(m => monsters.find(monster => monster._id.toString() === m))[0];
    if (!defenderMonster) {
      return 'defender-not-ready';
    }

    if (!monsters.some(m => attackers.some(a => a.team.includes(m._id.toString())))) {
      // the attackers have no monsters left
      return 'attackers-not-ready';
    }

    const encounter = await this.encounterService.create({region: defender.region, isWild: false});
    await this.opponentService.createSimple(encounter._id.toString(), defenderId, {
      isAttacker: false,
      isNPC: !!defender.npc,
      monster: defenderMonster._id.toString(),
    });

    await Promise.all(attackers.map(attacker => {
      const attackerId = attacker._id.toString();
      const monster = attacker.team.flatMap(m => monsters.find(monster => monster._id.toString() === m))[0];
      monster && this.opponentService.createSimple(encounter._id.toString(), attackerId, {
        isAttacker: true,
        isNPC: !!attacker.npc,
        monster: monster._id.toString(),
      });
    }));
    return encounter;
  }

  async createMonsterEncounter(defender: Trainer, type: number, level: number) {
    const defenderId = defender._id.toString();
    const isOpponentInBattle = await this.isInBattle([defenderId]);
    if (isOpponentInBattle) {
      // one of the trainers is already in a battle
      return;
    }

    const defenderMonsters = await this.monsterService.findAll({
      trainer: defenderId,
      'currentAttributes.health': {$gt: 0},
    });
    const defenderMonster = defender.team.flatMap(m => defenderMonsters.find(monster => monster._id.toString() === m))[0];
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

  private async isInBattle(trainers: string[]) {
    const opponents = await this.opponentService.findAll({
      trainer: {$in: trainers},
    });
    return !!opponents.length;
  }

}
