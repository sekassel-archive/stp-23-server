import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import * as memoizee from 'memoizee';
import {FilterQuery, Model, Types} from 'mongoose';

import {EventService} from '../event/event.service';
import {MemberResolverService, Namespace, UserFilter} from '../member-resolver/member-resolver.service';
import {Message} from './message.schema';
import {EventRepository, MongooseRepository} from "@mean-stream/nestx";
import {User} from "../user/user.schema";

@Injectable()
@EventRepository()
export class MessageService extends MongooseRepository<Message> {
  constructor(
    @InjectModel('messages') model: Model<Message>,
    private resolver: MemberResolverService,
    private eventEmitter: EventService,
  ) {
    super(model);
  }

  async deleteOrphaned(filter: FilterQuery<Message> = {}): Promise<Message[]> {
    const messages = await this.model.aggregate([
      {$match: filter},
      {$addFields: {_sender: {$toObjectId: '$sender'}}},
      {
        $lookup: {
          from: 'users',
          localField: '_sender',
          foreignField: '_id',
          as: 'sender',
        },
      },
      {$match: {sender: {$size: 0}}},
      {$unset: '_sender'},
    ]).exec();
    this.model.deleteMany({_id: {$in: messages.map(m => m._id)}});
    for (const message of messages) {
      this.emit('deleted', message);
    }
    return messages;
  }

  resolve = memoizee((namespace, parent) => this.resolver.resolve(namespace, parent), {
    primitive: true,
    promise: true,
  });

  async checkParent(namespace: Namespace, parent: Types.ObjectId, user: User) {
    const users = await this.resolver.resolve(namespace, parent);
    if (users === 'global') {
      return;
    }
    if (users.length === 0) {
      throw new NotFoundException(`${namespace}/${parent}`);
    }
    if (!users.includes(user._id.toString())) {
      throw new ForbiddenException('Cannot access messages within inaccessible parent.');
    }
    return;
  }

  private async emit(event: string, message: Message, users?: UserFilter) {
    if (!users) {
      users = await this.resolve(message.namespace, message.parent);
    }
    this.eventEmitter.emit(`${message.namespace}.${message.parent}.messages.${message._id}.${event}`, message, users === 'global' ? undefined : users);
  }
}
