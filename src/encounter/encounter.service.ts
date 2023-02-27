import {ForbiddenException, Injectable} from '@nestjs/common';
import {Types} from 'mongoose';
import {MonsterAttributes} from '../monster/monster.schema';
import {MonsterService} from '../monster/monster.service';
import {Encounter} from './encounter.schema';

import * as abilities from './abilities.json';

@Injectable()
export class EncounterService {
  constructor(
    private monsterService: MonsterService,
  ) {
  }

  async playRound(encounter: Encounter, abilityId: number, target: number): Promise<void> {
    const monsters = await this.monsterService.findAll({_id: {$in: encounter.monsters.map(s => new Types.ObjectId(s))}});
    const currentMonster = monsters[encounter.currentTurn % monsters.length];
    if (!currentMonster.abilities.includes(abilityId)) {
      throw new ForbiddenException('Your monster does not have this ability');
    }

    if (target >= monsters.length) {
      throw new ForbiddenException('Invalid target');
    }

    const targetMonster = monsters[target];
    const ability = abilities.find(a => a.id === abilityId);
    if (!ability) {
      throw new ForbiddenException('Invalid ability');
    }

    // TODO each effect
    targetMonster.attributes[ability.effects[0].attribute as keyof MonsterAttributes] += ability.effects[0].amount;
  }
}
