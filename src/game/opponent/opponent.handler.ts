import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Encounter} from '../encounter/encounter.schema';
import {EncounterService} from '../encounter/encounter.service';
import {MonsterService} from '../monster/monster.service';
import {Trainer} from '../trainer/trainer.schema';
import {Move, Opponent, OpponentDocument} from './opponent.schema';
import {OpponentService} from './opponent.service';

@Injectable()
export class OpponentHandler {
  constructor(
    private opponentService: OpponentService,
  ) {
  }

  @OnEvent('regions.*.trainers.*.deleted')
  async onTrainerDeleted(trainer: Trainer): Promise<void> {
    await this.opponentService.deleteAll({trainer: trainer._id.toString()});
  }

  @OnEvent('regions.*.encounters.*.deleted')
  async onEncounterDeleted(encounter: Encounter): Promise<void> {
    await this.opponentService.deleteAll({encounter: encounter._id.toString()});
  }

}
