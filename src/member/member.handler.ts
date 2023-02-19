import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {User} from '../user/user.schema';
import {MemberService} from './member.service';

@Injectable()
export class MemberHandler {
  constructor(
    private memberService: MemberService,
  ) {
  }

  @OnEvent('users.*.deleted')
  async onUserDeleted(user: User): Promise<void> {
    await this.memberService.deleteUser(user._id.toString());
  }
}
