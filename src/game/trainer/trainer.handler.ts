import {Injectable, OnModuleDestroy} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Cron, CronExpression} from '@nestjs/schedule';
import {Member} from '../../member/member.schema';
import {SocketService} from '../../udp/socket.service';
import {User} from '../../user/user.schema';
import {MoveTrainerDto} from './trainer.dto';
import {TrainerService} from './trainer.service';

@Injectable()
export class TrainerHandler implements OnModuleDestroy {
  constructor(
    private trainerService: TrainerService,
    private socketService: SocketService,
  ) {
  }

  locations = new Map<string, MoveTrainerDto>;

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
    this.locations.set(dto._id.toString(), dto);
  }

  async onModuleDestroy() {
    await this.flushLocations();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async flushLocations() {
    await this.trainerService.saveLocations(Array.from(this.locations.values()));
    this.locations.clear();
  }
}
