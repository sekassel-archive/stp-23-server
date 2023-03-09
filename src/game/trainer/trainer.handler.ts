import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Cron, CronExpression} from '@nestjs/schedule';
import {SocketService} from '../../udp/socket.service';
import {User} from '../../user/user.schema';
import {MoveTrainerDto} from './trainer.dto';
import {TrainerService} from './trainer.service';

@Injectable()
export class TrainerHandler implements OnModuleInit, OnModuleDestroy {
  constructor(
    private trainerService: TrainerService,
    private socketService: SocketService,
  ) {
  }

  locations = new Map<string, MoveTrainerDto>;

  async onModuleInit() {
    const locations = await this.trainerService.getLocations();
    for (const location of locations) {
      this.locations.set(location._id.toString(), location);
    }
  }

  @OnEvent('users.*.deleted')
  async onUserDeleted(user: User): Promise<void> {
    await this.trainerService.deleteUser(user._id.toString());
  }

  @OnEvent('areas.*.trainers.*.moved')
  onTrainerMoved(dto: MoveTrainerDto) {
    // TODO validate movement
    const oldLocation = this.locations.get(dto._id.toString());

    for (const location of this.locations.values()) {
      if (location.x === dto.x && location.y === dto.y) {
        // Someone is already at this location
        dto.x = oldLocation!.x;
        dto.y = oldLocation!.y;
      }
    }

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
