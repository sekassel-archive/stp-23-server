import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model} from 'mongoose';

import {EventService} from '../../event/event.service';
import {Member} from '../../member/member.schema';
import {UpdatePlayerDto} from './player.dto';
import {Player} from './player.schema';

@Injectable()
export class PlayerService {
  constructor(
    @InjectModel(Player.name) private model: Model<Player>,
    private eventEmitter: EventService,
  ) {
  }

  async createFromMember(member: Member): Promise<Player> {
    const created = await this.model.create({
      region: member.region,
      user: member.user,
      area: '', // TODO find spawn area
      coins: 0,
      x: 0,
      y: 0,
    });
    if (created) {
      this.emit('created', created);
    }
    return created;
  }

  async findAll(region: string, filter?: FilterQuery<Player>): Promise<Player[]> {
    return this.model.find({...filter, region}).exec();
  }

  async findOne(id: string): Promise<Player | null> {
    return this.model.findById(id).exec();
  }

  async update(id: string, dto: UpdatePlayerDto): Promise<Player | null> {
    const updated = await this.model.findByIdAndUpdate(id, dto, {new: true}).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteUser(user: string): Promise<Player[]> {
    const players = await this.model.find({user}).exec();
    for (const player of players) {
      this.emit('deleted', player);
    }
    await this.model.deleteMany({user}).exec();
    return players;
  }

  private emit(event: string, player: Player): void {
    this.eventEmitter.emit(`regions.${player.region}.players.${player._id}.${event}`, player);
  }
}
