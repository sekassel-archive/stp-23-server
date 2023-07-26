import {Injectable} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import {MoveTrainerDto} from '../../trainer/trainer.dto';
import {Path, Trainer} from '../../trainer/trainer.schema';
import {TrainerService} from '../../trainer/trainer.service';
import {EventEmitter2} from "@nestjs/event-emitter";
import {MovementService} from "../movement/movement.service";

@Injectable()
export class NpcMovementScheduler {
  constructor(
    private trainerService: TrainerService,
    private eventEmitter: EventEmitter2,
    private movementService: MovementService,
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
    const dto: MoveTrainerDto = {_id, area, x, y, direction: Math.floor(Math.random() * 4)};
    this.movementService.addDirection(dto, dto.direction);
    this.move(dto);
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

    const direction = newDir ?? this.movementService.getDirection(x, y, newX, newY);
    this.move({_id, area, x: newX, y: newY, direction});
  }

  private move(dto: MoveTrainerDto) {
    this.eventEmitter.emit(`udp:areas.${dto.area}.trainers.${dto._id}.moved`, dto);
  }
}
