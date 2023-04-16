import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {User} from '../../user/user.schema';
import {TrainerService} from './trainer.service';

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
}
