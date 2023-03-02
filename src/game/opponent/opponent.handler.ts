import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Encounter} from '../encounter/encounter.schema';
import {Player} from '../player/player.schema';
import {OpponentService} from './opponent.service';

@Injectable()
export class OpponentHandler {
  constructor(
    private opponentService: OpponentService,
  ) {
  }

  @OnEvent('regions.*.players.*.deleted')
  async onPlayerDeleted(player: Player): Promise<void> {
    await this.opponentService.deleteAll({trainer: player._id.toString()});
  }

  @OnEvent('regions.*.encounters.*.deleted')
  async onEncounterDeleted(encounter: Encounter): Promise<void> {
    await this.opponentService.deleteAll({encounter: encounter._id.toString()});
  }
}
