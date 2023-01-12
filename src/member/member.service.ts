import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FilterQuery, Model } from 'mongoose';

import { EventService } from '../event/event.service';
import { Game } from '../game/game.schema';
import { GameService } from '../game/game.service';
import { CreateMemberDto, UpdateMemberDto } from './member.dto';
import { Member } from './member.schema';

@Injectable()
export class MemberService {
  constructor(
    @InjectModel('members') private model: Model<Member>,
    private eventEmitter: EventService,
    private gameService: GameService,
  ) {
  }

  async checkPassword(game: Game, member: CreateMemberDto): Promise<boolean> {
    return bcrypt.compare(member.password, game.passwordHash);
  }

  async create(gameId: string, userId: string, member: CreateMemberDto): Promise<Member> {
    const created = await this.model.create({ ...member, password: undefined, userId, gameId });
    if (created) {
      await this.gameService.changeMembers(gameId, +1);
      this.emit('created', created);
    }
    return created;
  }

  async findAll(gameId: string, filter?: FilterQuery<Member>): Promise<Member[]> {
    return this.model.find({ ...filter, gameId }).exec();
  }

  async findOne(gameId: string, userId: string): Promise<Member | null> {
    return this.model.findOne({ gameId, userId }).exec();
  }

  async update(gameId: string, userId: string, dto: UpdateMemberDto): Promise<Member | null> {
    const updated = await this.model.findOneAndUpdate({ gameId, userId }, dto, { new: true }).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteGame(gameId: string): Promise<Member[]> {
    const members = await this.findAll(gameId);
    for (const member of members) {
      this.emit('deleted', member);
    }
    await this.model.deleteMany({ gameId }).exec();
    return members;
  }

  async deleteUser(userId: string): Promise<Member[]> {
    const members = await this.model.find({ userId }).exec();
    for (const member of members) {
      this.emit('deleted', member);
    }
    await Promise.all(members.map(member => this.gameService.changeMembers(member.gameId, -1)));
    await this.model.deleteMany({ userId }).exec();
    return members;
  }

  async delete(gameId: string, userId: string): Promise<Member | null> {
    const deleted = await this.model.findOneAndDelete({ gameId, userId }).exec();
    if (deleted) {
      await this.gameService.changeMembers(gameId, -1);
      this.emit('deleted', deleted);
    }
    return deleted;
  }

  private emit(event: string, member: Member): void {
    this.eventEmitter.emit(`games.${member.gameId}.members.${member.userId}.${event}`, member);
  }
}
