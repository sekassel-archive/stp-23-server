import {Injectable} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Cron, CronExpression} from '@nestjs/schedule';
import {MoveTrainerDto} from './trainer.dto';
import {Direction} from './trainer.schema';
import {TrainerService} from './trainer.service';

@Injectable()
export class TrainerScheduler {
  constructor(
    private trainerService: TrainerService,
    private eventEmitter: EventEmitter2,
  ) {
  }

  @Cron(CronExpression.EVERY_SECOND)
  async onTick() {
    const npcs = await this.trainerService.findAll({npc: {$exists: true}});
    for (const npc of npcs) {
      const path = npc.npc?.path;
      if (!path) {
        continue;
      }

      const {_id, area, x, y} = npc;
      const index = path.findIndex((v, i) => i % 2 === 0 && v === x && path[i + 1] === y);
      if (index < 0) {
        continue;
      }

      const next = (index + 2) % path.length;
      const newX = path[next];
      const newY = path[next + 1];
      const direction = this.getDirection(x, y, newX, newY);
      const move: MoveTrainerDto = {_id, area, x: newX, y: newY, direction};
      this.eventEmitter.emit(`areas.${area}.trainers.${_id}.moved`, move);
    }
  }

  private getDirection(x1: number, y1: number, x2: number, y2: number): Direction {
    if (x1 === x2) {
      return y1 < y2 ? Direction.DOWN : Direction.UP;
    }
    return x1 < x2 ? Direction.RIGHT : Direction.LEFT;
  }
}
