import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';

import {EventService} from '../event/event.service';
import {RegionService} from '../region/region.service';
import {CreateMemberDto, UpdateMemberDto} from './member.dto';
import {Member} from './member.schema';

@Injectable()
export class MemberService {
  constructor(
    @InjectModel(Member.name) private model: Model<Member>,
    private eventEmitter: EventService,
    private regionService: RegionService,
  ) {
  }

  async create(region: string, user: string, member: CreateMemberDto): Promise<Member> {
    const created = await this.model.create({...member, password: undefined, user, region});
    if (created) {
      await this.regionService.changeMembers(region, +1);
      this.emit('created', created);
    }
    return created;
  }

  async findAll(region: string, filter?: FilterQuery<Member>): Promise<Member[]> {
    return this.model.find({...filter, region}).exec();
  }

  async findOne(region: string, user: string): Promise<Member | null> {
    return this.model.findOne({region, user}).exec();
  }

  async update(region: string, user: string, dto: UpdateMemberDto): Promise<Member | null> {
    const updated = await this.model.findOneAndUpdate({region, user}, dto, {new: true}).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteUser(user: string): Promise<Member[]> {
    const members = await this.model.find({user}).exec();
    for (const member of members) {
      this.emit('deleted', member);
    }
    await Promise.all(members.map(member => this.regionService.changeMembers(member.region, -1)));
    await this.model.deleteMany({user}).exec();
    return members;
  }

  async delete(region: string, user: string): Promise<Member | null> {
    const deleted = await this.model.findOneAndDelete({region, user}).exec();
    if (deleted) {
      await this.regionService.changeMembers(region, -1);
      this.emit('deleted', deleted);
    }
    return deleted;
  }

  private emit(event: string, member: Member): void {
    this.eventEmitter.emit(`regions.${member.region}.members.${member.user}.${event}`, member);
  }
}
