import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Vote } from '../vote/vote.schema';
import { MapTemplateService } from './map-template.service';

@Injectable()
export class MapTemplateHandler {
  constructor(
    private mapTemplateService: MapTemplateService,
  ) {
  }

  @OnEvent('maps.*.votes.*.created')
  async onVoteCreated(vote: Vote) {
    await this.mapTemplateService.update(vote.mapId, {
      $inc: { votes: vote.score },
    });
  }

  @OnEvent('maps.*.votes.*.updated')
  async onVoteUpdated(vote: Vote, users: any, oldVote: Vote) {
    const delta = vote.score - oldVote.score;
    if (!delta) {
      return;
    }

    await this.mapTemplateService.update(vote.mapId, {
      $inc: { votes: delta },
    });
  }

  @OnEvent('maps.*.votes.*.deleted')
  async onVoteDelete(vote: Vote) {
    await this.mapTemplateService.update(vote.mapId, {
      $inc: { votes: -vote.score },
    });
  }
}
