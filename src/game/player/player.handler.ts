import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Member} from '../../member/member.schema';
import {SocketService} from '../../udp/socket.service';
import {User} from '../../user/user.schema';
import {MovePlayerDto} from './player.dto';
import {PlayerService} from './player.service';

@Injectable()
export class PlayerHandler {
  constructor(
    private playerService: PlayerService,
    private socketService: SocketService,
  ) {
  }

  @OnEvent('members.*.created')
  async onMemberCreated(member: Member): Promise<void> {
    await this.playerService.createFromMember(member);
  }

  @OnEvent('users.*.deleted')
  async onUserDeleted(user: User): Promise<void> {
    await this.playerService.deleteUser(user._id.toString());
  }

  @OnEvent('areas.*.players.*.moved')
  onPlayerMoved(dto: MovePlayerDto) {
    // TODO validate movement
    this.socketService.broadcast(`areas.${dto.area}.players.${dto._id}.moved`, dto);
    this.playerService.update(dto._id.toString(), {x: dto.x, y: dto.y});
  }
}
