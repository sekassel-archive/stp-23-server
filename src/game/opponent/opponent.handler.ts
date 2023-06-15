import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Encounter} from '../encounter/encounter.schema';
import {Trainer} from '../trainer/trainer.schema';
import {OpponentService} from './opponent.service';

@Injectable()
export class OpponentHandler {
  constructor(
    private opponentService: OpponentService,
  ) {
  }

  @OnEvent('regions.*.trainers.*.deleted')
  async onTrainerDeleted(trainer: Trainer): Promise<void> {
    await this.opponentService.deleteMany({trainer: trainer._id.toString()});
  }

  @OnEvent('regions.*.encounters.*.deleted')
  async onEncounterDeleted(encounter: Encounter): Promise<void> {
    await this.opponentService.deleteMany({encounter: encounter._id.toString()});
  }

}
