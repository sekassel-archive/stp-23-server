import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {TALL_GRASS_TRAINER} from '../constants';
import {Opponent} from '../opponent/opponent.schema';
import {Trainer} from '../trainer/trainer.schema';
import {MonsterService} from './monster.service';

@Injectable()
export class MonsterHandler {
  constructor(
    private monsterService: MonsterService,
  ) {
  }

  @OnEvent('regions.*.trainers.*.deleted')
  async onTrainerDeleted(trainer: Trainer): Promise<void> {
    await this.monsterService.deleteMany({trainer: trainer._id.toString()});
  }

  /**
   * Delete tall grass monsters when defeated
   */
  @OnEvent(`encounters.*.opponents.${TALL_GRASS_TRAINER}.deleted`)
  async onOpponentDeleted(opponent: Opponent): Promise<void> {
    opponent.monster && await this.monsterService.delete(opponent.monster.toString());
  }
}
