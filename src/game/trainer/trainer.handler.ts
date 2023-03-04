import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Member} from '../../member/member.schema';
import {SocketService} from '../../udp/socket.service';
import {User} from '../../user/user.schema';
import {MoveTrainerDto} from './trainer.dto';
import {TrainerService} from './trainer.service';

@Injectable()
export class TrainerHandler {
  constructor(
    private trainerService: TrainerService,
    private socketService: SocketService,
  ) {
  }

  @OnEvent('members.*.created')
  async onMemberCreated(member: Member): Promise<void> {
    await this.trainerService.createFromMember(member);
  }

  @OnEvent('users.*.deleted')
  async onUserDeleted(user: User): Promise<void> {
    await this.trainerService.deleteUser(user._id.toString());
  }

  @OnEvent('areas.*.trainers.*.moved')
  onTrainerMoved(dto: MoveTrainerDto) {
    // TODO validate movement
    this.socketService.broadcast(`areas.${dto.area}.trainers.${dto._id}.moved`, dto);
    this.trainerService.update(dto._id.toString(), {x: dto.x, y: dto.y});
  }
}
