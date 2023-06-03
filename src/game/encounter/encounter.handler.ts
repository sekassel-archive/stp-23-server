import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Opponent} from '../opponent/opponent.schema';
import {OpponentService} from '../opponent/opponent.service';
import {EncounterService} from './encounter.service';
import {Types} from "mongoose";

@Injectable()
export class EncounterHandler {
  constructor(
    private encounterService: EncounterService,
    private opponentService: OpponentService,
  ) {
  }

  @OnEvent('encounters.*.opponents.*.deleted')
  async onOpponentDeleted(opponent: Opponent): Promise<void> {
    const opponents = await this.opponentService.findAll({encounter: opponent.encounter.toString()});
    if (opponents.some(o => o.isAttacker) && opponents.some(o => !o.isAttacker)) {
      // there are still opponents on both sides
      return;
    }

    // all opponents on one side have been defeated
    await this.encounterService.delete(new Types.ObjectId(opponent.encounter));
  }
}
