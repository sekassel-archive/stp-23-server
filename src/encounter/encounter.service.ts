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

    ability.effects.forEach(function (value) {
      if(value.chance == null || Math.random() <= value.chance){
        const effectTarget = (value.self === true || (value.self == null && value.amount > 0)) ? currentMonster : targetMonster;
        let effectAmount:number = value.amount;

        if(value.attribute === "health"){
          if(effectTarget.attributes.defense > value.amount + currentMonster.attributes.attack){
            effectAmount = 0;
          }
          else{
            effectAmount += currentMonster.attributes.attack - effectTarget.attributes.defense;
          }

          effectAmount *= 1; //TODO check effectiveness
        }

        effectTarget.attributes[value.attribute as keyof MonsterAttributes] += effectAmount;

        // Null check
        for(const key in effectTarget.attributes){
          if(effectTarget.attributes[key as keyof MonsterAttributes] < 0) effectTarget.attributes[key as keyof MonsterAttributes] = 0;
        }
      }
    });

    // TODO update currentTurn
  }
}
