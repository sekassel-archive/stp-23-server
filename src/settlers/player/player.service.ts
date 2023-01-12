import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { EventService } from '../../event/event.service';
import { Game } from '../../game/game.schema';
import { MemberService } from '../../member/member.service';
import { INITIAL_BUILDINGS, RESOURCE_TYPES } from '../shared/constants';
import { Player, PlayerDocument } from './player.schema';

const COLOR_PALETTE = [
  '#ff0000',
  '#00ff00',
  '#0080ff',
  '#ffffff',
  '#ff8000',
  '#8000ff',
  '#ffff00',
  '#0000ff',
  '#ff00ff',
  '#ff0080',
];

@Injectable()
export class PlayerService {
  constructor(
    @InjectModel('players') private model: Model<Player>,
    private memberService: MemberService,
    private eventEmitter: EventService,
  ) {
  }

  async findAll(gameId: string, filter: FilterQuery<Player> = {}, sort?: any): Promise<PlayerDocument[]> {
    let query = this.model.find({ ...filter, gameId });
    if (sort) {
      query = query.sort(sort);
    }
    return query.exec();
  }

  async findOne(gameId: string, userId: string): Promise<PlayerDocument | null> {
    return this.model.findOne({ gameId, userId }).exec();
  }

  mask(player: PlayerDocument): Player {
    const { resources, developmentCards, victoryPoints, ...rest } = player.toObject<Player>();
    const unknown = Object.values(resources).sum();
    return {
      ...rest,
      resources: { unknown },
      victoryPoints: victoryPoints ? victoryPoints - (developmentCards?.filter(c => c.type === 'victory-point')?.length ?? 0) : 0,
      developmentCards: developmentCards?.map(d => d.revealed ? d : ({
        ...d,
        type: 'unknown',
      })),
    };
  }

  async createForGame(game: Game): Promise<PlayerDocument[]> {
    const gameId = game._id.toString();

    const members = await this.memberService.findAll(gameId, {
      spectator: { $ne: true },
    });

    const startingResources = game.settings?.startingResources;
    const players: Player[] = members.map((m, index) => ({
      gameId,
      userId: m.userId,
      color: m.color ?? COLOR_PALETTE[index % COLOR_PALETTE.length],
      active: true,
      resources: startingResources ? Object.fromEntries(RESOURCE_TYPES.map(r => [r, startingResources])) : {},
      remainingBuildings: INITIAL_BUILDINGS,
      victoryPoints: 0,
      developmentCards: [],
    }));
    try {
      const playerDocs = await this.model.insertMany(players);
      this.emit('created', ...playerDocs);
      return playerDocs;
    } catch (err: any) {
      if (err.code === 11000) { // players already exist
        return [];
      }
      throw err;
    }
  }

  async update(gameId: string, userId: string, dto: UpdateQuery<Player>, filter?: FilterQuery<Player>): Promise<PlayerDocument | null> {
    const updated = await this.model.findOneAndUpdate({ ...filter, gameId, userId }, dto, { new: true }).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteByGame(gameId: string): Promise<void> {
    const players = await this.findAll(gameId);
    await this.model.deleteMany({ gameId }).exec();
    this.emit('deleted', ...players);
  }

  private emit(action: string, ...players: PlayerDocument[]) {
    if (!players.length) {
      return;
    }
    const maskedPlayers = players.map(p => this.mask(p));
    this.memberService.findAll(players[0].gameId).then(members => {
      const users = members.map(m => m.userId);
      for (let i = 0; i < players.length; i++){
        const player = players[i];
        const event = `games.${player.gameId}.players.${player.userId}.${action}`;
        this.eventEmitter.emit(event, player, [player.userId]);

        const maskedPlayer = maskedPlayers[i];
        const otherUserIds = users.filter(u => u !== player.userId);
        this.eventEmitter.emit(event, maskedPlayer, otherUserIds);
      }
    });
  }
}
