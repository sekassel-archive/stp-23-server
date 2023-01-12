import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as memoizee from 'memoizee';
import { FilterQuery, Model } from 'mongoose';

import { EventService } from '../event/event.service';
import { MemberResolverService, Namespace, UserFilter } from '../member-resolver/member-resolver.service';
import { CreateMessageDto, UpdateMessageDto } from './message.dto';
import { Message, MessageDocument } from './message.schema';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel('messages') private model: Model<Message>,
    private resolver: MemberResolverService,
    private eventEmitter: EventService,
  ) {
  }

  async find(namespace: Namespace, parent: string, _id: string): Promise<MessageDocument | null> {
    return this.model.findOne({ _id, namespace, parent }).exec();
  }

  async findAll(namespace?: Namespace, parent?: string, filter: FilterQuery<Message> = {}, limit?: number): Promise<MessageDocument[]> {
    namespace && (filter.namespace = namespace);
    parent && (filter.parent = parent);
    let query = this.model.find(filter).sort('-createdAt');
    if (limit) {
      query = query.limit(limit);
    }
    const messages = await query.exec();
    messages.reverse();
    return messages;
  }

  async create(namespace: Namespace, parent: string, sender: string, message: CreateMessageDto, users: UserFilter): Promise<MessageDocument> {
    const created = await this.model.create({ ...message, namespace, parent, sender });
    created && this.sendEvent('created', created, users);
    return created;
  }

  async update(namespace: Namespace, parent: string, _id: string, dto: UpdateMessageDto, users: UserFilter): Promise<MessageDocument | null> {
    const updated = await this.model.findOneAndUpdate({ namespace, parent, _id }, dto, { new: true }).exec();
    updated && this.sendEvent('updated', updated, users);
    return updated;
  }

  async delete(namespace: Namespace, parent: string, _id: string, users: UserFilter): Promise<MessageDocument | null> {
    const deleted = await this.model.findOneAndDelete({ namespace, parent, _id }).exec();
    deleted && this.sendEvent('deleted', deleted, users);
    return deleted;
  }

  async deleteAll(namespace?: Namespace, parent?: string, users?: UserFilter, filter?: FilterQuery<Message>): Promise<MessageDocument[]> {
    const messages = await this.findAll(namespace, parent, filter);
    return this._deleteAll(messages, users);
  }

  async deleteOrphaned(filter: FilterQuery<Message> = {}): Promise<MessageDocument[]> {
    const messages = await this.model.aggregate([
      { $match: filter },
      { $addFields: { _sender: { $toObjectId: '$sender' } } },
      {
        $lookup: {
          from: 'users',
          localField: '_sender',
          foreignField: '_id',
          as: 'sender',
        },
      },
      { $match: { sender: { $size: 0 } } },
      { $unset: '_sender' },
    ]).exec();
    return this._deleteAll(messages);
  }

  private async _deleteAll(messages: MessageDocument[], users?: UserFilter) {
    await this.model.deleteMany({ _id: { $in: messages.map(m => m._id) } }).exec();

    const resolve = memoizee((namespace, parent) => this.resolver.resolve(namespace, parent), {
      primitive: true,
      promise: true,
    });
    for (const message of messages) {
      this.sendEvent('deleted', message, users ?? await resolve(message.namespace, message.parent));
    }
    return messages;
  }

  private sendEvent(event: string, message: Message, users: UserFilter): void {
    this.eventEmitter.emit(`${message.namespace}.${message.parent}.messages.${message._id}.${event}`, message, users === 'global' ? undefined : users);
  }
}
