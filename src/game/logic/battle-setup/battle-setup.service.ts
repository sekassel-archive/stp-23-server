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
    const isOpponentInBattle = await this.isInBattle([defenderId, ...attackerIds]);
    if (isOpponentInBattle) {
      // one of the trainers is already in a battle
      return;
    }

    await this.monsterService.healAll({
      trainer: {$in: [defender, ...attackers].filter(t => t.npc).map(t => t._id.toString())},
    });

    const monsters = await this.monsterService.findAll({
      trainer: {$in: [defenderId, ...attackerIds]},
      'currentAttributes.health': {$gt: 0},
    });
    const defenderMonster = monsters.find(m => m.trainer === defenderId)?._id?.toString(); // FIXME monster order
    if (!defenderMonster) {
      return;
    }

    if (!monsters.some(m => m.trainer !== defenderId)) {
      // the attackers have no monsters left
      return;
    }

    const encounter = await this.encounterService.create(defender.region, {isWild: false});
    await this.opponentService.create(encounter._id.toString(), defenderId, {
      isAttacker: false,
      isNPC: !!defender.npc,
      monster: defenderMonster,
    });

    await Promise.all(attackers.map(attacker => {
      const attackerId = attacker._id.toString();
      const monster = monsters.find(m => m.trainer === attackerId)?._id?.toString();
      monster && this.opponentService.create(encounter._id.toString(), attackerId, {
        isAttacker: true,
        isNPC: !!attacker.npc,
        monster,
      });
    }));
  }

  async createMonsterEncounter(region: string, defender: string, type: number, level: number) {
    const isOpponentInBattle = await this.isInBattle([defender]);
    if (isOpponentInBattle) {
      // one of the trainers is already in a battle
      return;
    }

    const defenderMonster = (await this.monsterService.findAll({
      trainer: defender,
      'currentAttributes.health': {$gt: 0},
    }))[0]?._id?.toString(); // FIXME monster order
    if (!defenderMonster) {
      return;
    }

    const encounter = await this.encounterService.create(region, {isWild: true});
    await this.opponentService.create(encounter._id.toString(), defender, {
      isAttacker: false,
      isNPC: false,
      monster: defenderMonster,
    });
    const wildMonster = await this.monsterService.create(TALL_GRASS_TRAINER, this.monsterGeneratorService.autofill(type, level));
    await this.opponentService.create(encounter._id.toString(), TALL_GRASS_TRAINER, {
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
