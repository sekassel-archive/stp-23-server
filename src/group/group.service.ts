import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {Model, Types} from 'mongoose';

import { EventService } from '../event/event.service';
import { CreateGroupDto, UpdateGroupDto } from './group.dto';
import {Group, GroupDocument} from './group.schema';
import {MongooseRepository} from "@mean-stream/nestx";

@Injectable()
export class GroupService extends MongooseRepository<Group> {
  constructor(
    @InjectModel('groups') model: Model<Group>,
    private eventEmitter: EventService,
  ) {
    super(model);
  }

  async findByMember(id: string): Promise<Group[]> {
    return this.model.find({ members: id }).exec();
  }

  async findByMembers(members: string[]): Promise<Group[]> {
    members = this.normalizeMembers(members);
    return this.model.find({ members }).exec();
  }

  async create(dto: CreateGroupDto): Promise<GroupDocument> {
    dto.members = this.normalizeMembers(dto.members);
    return super.create(dto);
  }

  async update(id: Types.ObjectId, dto: UpdateGroupDto): Promise<GroupDocument | null> {
    const oldGroup = await this.findOne(id);
    if (dto.members) {
      dto.members = this.normalizeMembers(dto.members);
    }
    const updated = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    updated && this.emit('updated', updated, oldGroup?.members);
    return updated;
  }

  private normalizeMembers(members: string[]): string[] {
    return [...new Set(members)].sort();
  }

  async deleteEmptyGroups(olderThanMs: number): Promise<Group[]> {
    const groups = await this.model.aggregate([
      {
        $match: {
          createdAt: {$lt: new Date(Date.now() - olderThanMs)},
        },
      },
      {
        $addFields: {
          id: {
            $toString: '$_id',
          },
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'id',
          foreignField: 'parent',
          as: 'messages',
        },
      },
      {
        $match: {
          messages: { $size: 0 },
        },
      },
      {
        $unset: ['messages', 'id'],
      },
    ]);
    await this.model.deleteMany({ _id: { $in: groups.map(g => g._id) } });
    for (const group of groups) {
      this.emit('deleted', group);
    }
    return groups;
  }

  private emit(event: string, group: Group, oldMembers?: string[]): void {
    const members = oldMembers ? group.members.concat(oldMembers) : group.members;
    this.eventEmitter.emit(`groups.${group._id}.${event}`, group, members);
  }
}
