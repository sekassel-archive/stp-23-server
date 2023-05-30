import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {User} from '../../user/user.schema';
import {TrainerService} from './trainer.service';
import {Monster} from "../monster/monster.schema";

@Injectable()
export class TrainerHandler {
  constructor(
    private trainerService: TrainerService,
  ) {
  }

  @OnEvent('users.*.deleted')
  async onUserDeleted(user: User): Promise<void> {
    await this.trainerService.deleteUser(user._id.toString());
  }

  @OnEvent('trainers.*.monsters.*.created')
  async onMonsterCreated(monster: Monster): Promise<void> {
    await this.trainerService.addToTeam(monster.trainer, monster._id.toString());
  }
}
