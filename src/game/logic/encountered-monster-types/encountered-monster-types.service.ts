import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Types} from 'mongoose';
import {MonsterService} from '../../monster/monster.service';
import {OpponentDocument} from '../../opponent/opponent.schema';
import {OpponentService} from '../../opponent/opponent.service';
import {TrainerService} from '../../trainer/trainer.service';

@Injectable()
export class EncounteredMonsterTypesService {
  constructor(
    private opponentService: OpponentService,
    private monsterService: MonsterService,
    private trainerService: TrainerService,
  ) {
  }

  @OnEvent('encounters.*.opponents.*.created')
  @OnEvent('encounters.*.opponents.*.updated')
  async onOpponent(opponent: OpponentDocument) {
    const monster = opponent.monster && await this.monsterService.findOne(new Types.ObjectId(opponent.monster));
    if (!monster) {
      return;
    }

    const otherOpponents = await this.opponentService.findAll({
      encounter: opponent.encounter,
      _id: {$ne: opponent._id},
    });
    await this.trainerService.updateMany({
      _id: {$in: otherOpponents.map(o => new Types.ObjectId(o.trainer))},
    }, {
      $addToSet: {
        encounteredMonsterTypes: monster.type,
      },
    });
  }
}
