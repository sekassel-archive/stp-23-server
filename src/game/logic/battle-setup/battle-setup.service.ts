import {Injectable} from '@nestjs/common';
import {TALL_GRASS_TRAINER} from '../../constants';
import {EncounterService} from '../../encounter/encounter.service';
import {MonsterService} from '../../monster/monster.service';
import {OpponentService} from '../../opponent/opponent.service';
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

  async createTrainerBattle(region: string, defender: string, defenderIsNPC: boolean, attackers: string[]) {
    const isOpponentInBattle = await this.isInBattle([defender, ...attackers]);
    if (isOpponentInBattle) {
      // one of the trainers is already in a battle
      return;
    }

    await this.monsterService.healAll(defenderIsNPC ? {
      trainer: defender,
    } : {
      trainer: {$in: attackers},
    });

    const monsters = await this.monsterService.findAll({
      trainer: {$in: [defender, ...attackers]},
      'currentAttributes.health': {$gt: 0},
    });
    const defenderMonster = monsters.find(m => m.trainer === defender)?._id?.toString(); // FIXME monster order
    if (!defenderMonster) {
      return;
    }

    if (!monsters.some(m => m.trainer !== defender)) {
      // the attackers have no monsters left
      return;
    }

    const encounter = await this.encounterService.create(region, {isWild: false});
    await this.opponentService.create(encounter._id.toString(), defender, {
      isAttacker: false,
      isNPC: defenderIsNPC,
      monster: defenderMonster,
    });

    await Promise.all(attackers.map(attacker => {
      const monster = monsters.find(m => m.trainer === attacker)?._id?.toString();
      monster && this.opponentService.create(encounter._id.toString(), attacker, {
        isAttacker: true,
        isNPC: !defenderIsNPC,
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
