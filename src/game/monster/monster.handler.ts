import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
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
}
