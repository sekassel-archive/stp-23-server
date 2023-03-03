import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Opponent} from '../opponent/opponent.schema';
import {EncounterService} from './encounter.service';

@Injectable()
export class EncounterHandler {
  constructor(
    private encounterService: EncounterService,
  ) {
  }

  @OnEvent('encounters.*.opponents.*.updated')
  async onOpponentUpdated(data: Opponent): Promise<void> {
    const encounter = await this.encounterService.findOne(data.encounter);
    if (!encounter) {
      return;
    }
    await this.encounterService.playRound(encounter);
  }
}
