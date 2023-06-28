import {Injectable} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import {Types} from 'mongoose';
import {MoveTrainerDto} from '../../trainer/trainer.dto';
import {Direction, Path, Trainer} from '../../trainer/trainer.schema';
import {TrainerService} from '../../trainer/trainer.service';
import {EventEmitter2} from "@nestjs/event-emitter";

@Injectable()
export class NpcMovementScheduler {
  constructor(
    private trainerService: TrainerService,
    private eventEmitter: EventEmitter2,
  ) {
  }

  @Cron(CronExpression.EVERY_SECOND)
  async onTick() {
    const npcs = await this.trainerService.findAll({
      $or: [
        {'npc.walkRandomly': true},
        {'npc.path.1': {$exists: true}},
      ],
    });
    for (const npc of npcs) {
      const path = npc.npc?.path;
      if (path) {
        this.moveByPath(npc, path);
      } else if (npc.npc?.walkRandomly) {
        this.moveRandomly(npc);
      }
    }
  }

  private moveRandomly(npc: Trainer) {
    const {_id, area, x, y} = npc;
    const direction = Math.floor(Math.random() * 4);
    const newX = x + (direction === Direction.LEFT ? -1 : direction === Direction.RIGHT ? 1 : 0);
    const newY = y + (direction === Direction.UP ? -1 : direction === Direction.DOWN ? 1 : 0);
    this.move(_id, area, newX, newY, direction);
  }

  private moveByPath(trainer: Trainer, path: Path) {
    const {_id, area, x, y} = trainer;
    const index = path.findIndex(([px, py, pd]) => px === x && py === y && (pd === undefined || pd === trainer.direction));
    if (index < 0) {
      return;
    }

    const next = (index + 1) % path.length;
    const [newX, newY, newDir] = path[next];
    if (Math.abs(newX - x) + Math.abs(newY - y) > 1) {
      // Path cannot be followed, probably because it was not intended to loop
      return;
    }

    const direction = newDir ?? this.getDirection(x, y, newX, newY);
    this.move(_id, area, newX, newY, direction);
  }

  private move(_id: Types.ObjectId, area: string, x: number, y: number, direction: Direction) {
    const move: MoveTrainerDto = {_id, area, x, y, direction};
    this.eventEmitter.emit(`udp:areas.${area}.trainers.${_id}.moved`, move);
  }

  private getDirection(x1: number, y1: number, x2: number, y2: number): Direction {
    if (x1 === x2) {
      return y1 < y2 ? Direction.DOWN : Direction.UP;
    }
    return x1 < x2 ? Direction.RIGHT : Direction.LEFT;
  }
}
