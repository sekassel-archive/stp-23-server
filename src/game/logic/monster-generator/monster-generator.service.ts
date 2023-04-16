import {Injectable, NotFoundException} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {abilities as allAbilities, Ability, monsterTypes} from '../../constants';
import {attackAtLevel, defenseAtLevel, healthAtLevel, speedAtLevel} from '../../formulae';
import {CreateMonsterDto} from '../../monster/monster.dto';
import {MAX_ABILITIES, MonsterDocument} from '../../monster/monster.schema';
import {MonsterService} from '../../monster/monster.service';
import {Trainer} from '../../trainer/trainer.schema';

@Injectable()
export class MonsterGeneratorService {
  constructor(
    private monsterService: MonsterService,
  ) {
  }

  // TODO remove in v3 - monsters can be received from a Prof.
  @OnEvent('regions.*.trainers.*.created')
  async onTrainerCreated(trainer: Trainer): Promise<void> {
    await this.createAuto(trainer._id.toString(), 1, 1);
  }

  autofill(type: number, level: number): CreateMonsterDto {
    const monsterType = monsterTypes.find(t => t.id === type);
    if (!monsterType) {
      throw new NotFoundException('Invalid monster type');
    }
    const abilities = this.findBestAbilities(this.getPossibleAbilities(level, monsterType.type)).map(a => a.id);
    return {
      type,
      level,
      attributes: {
        health: healthAtLevel(level),
        attack: attackAtLevel(level),
        defense: defenseAtLevel(level),
        speed: speedAtLevel(level),
      },
      abilities,
    };
  }

  getPossibleAbilities(level: number, types: string[]) {
    // filter by minLevel and type (normal or one of monster types)
    return allAbilities.filter(a => level >= a.minLevel && (a.type === 'normal' || types.includes(a.type)));
  }

  findBestAbilities(abilities: Ability[]) {
    return abilities
      // bring some randomness
      .shuffle()
      // sort by minLevel descending - we want the best abilities
      .sort((a, b) => b.minLevel - a.minLevel)
      // take the best
      .slice(0, MAX_ABILITIES);
  }

  async createAuto(trainer: string, type: number, level: number): Promise<MonsterDocument> {
    const dto = this.autofill(type, level);
    return this.monsterService.upsert({
      trainer,
      // TODO this ensures that the same monster is not added twice,
      //      but maybe it should be possible to have multiple monsters of the same type
      type,
    }, {
      ...dto,
      trainer,
      experience: 0,
      currentAttributes: dto.attributes,
    });
  }

}
