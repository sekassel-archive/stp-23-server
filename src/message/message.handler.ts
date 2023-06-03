import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Group} from '../group/group.schema';
import {MemberResolverService, Namespace} from '../member-resolver/member-resolver.service';
import {GlobalSchema} from '../util/schema';
import {MessageService} from './message.service';

@Injectable()
export class MessageHandler {
  constructor(
    private messageService: MessageService,
    private memberResolver: MemberResolverService,
  ) {
  }

  @OnEvent('groups.*.deleted')
  async onGroupDeleted(group: Group): Promise<void> {
    return this.onDelete(Namespace.groups, group);
  }

  private async onDelete(namespace: Namespace, entity: GlobalSchema): Promise<void> {
    const members = await this.memberResolver.resolve(namespace, entity._id);
    await this.messageService.deleteAll(namespace, entity._id.toString(), members);
  }
}
