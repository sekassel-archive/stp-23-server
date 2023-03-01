import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Player} from '../player/player.schema';
import {MonsterService} from './monster.service';

@Injectable()
export class MonsterHandler {
  constructor(
    private monsterService: MonsterService,
  ) {
  }

  @OnEvent('regions.*.players.*.deleted')
  async onUserDeleted(player: Player): Promise<void> {
    await this.monsterService.deletePlayer(player._id.toString());
  }
}
