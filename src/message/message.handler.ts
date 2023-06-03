import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Group} from '../group/group.schema';
import {Namespace} from '../member-resolver/member-resolver.service';
import {GlobalSchema} from '../util/schema';
import {MessageService} from './message.service';

@Injectable()
export class MessageHandler {
  constructor(
    private messageService: MessageService,
  ) {
  }

  @OnEvent('groups.*.deleted')
  async onGroupDeleted(group: Group): Promise<void> {
    return this.onDelete(Namespace.groups, group);
  }

  private async onDelete(namespace: Namespace, entity: GlobalSchema): Promise<void> {
    await this.messageService.deleteMany({namespace, parent: entity._id.toString()});
  }
}
