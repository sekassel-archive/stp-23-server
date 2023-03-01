import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Member} from '../../member/member.schema';
import {User} from '../../user/user.schema';
import {PlayerService} from './player.service';

@Injectable()
export class PlayerHandler {
  constructor(
    private playerService: PlayerService,
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
}
