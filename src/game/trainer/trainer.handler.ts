import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {User} from '../../user/user.schema';
import {TrainerService} from './trainer.service';
import {Monster} from "../monster/monster.schema";
import {Types} from "mongoose";
import {Trainer} from "./trainer.schema";
import {MAX_TEAM_SIZE} from "../constants";

@Injectable()
export class TrainerHandler {
  constructor(
    private trainerService: TrainerService,
  ) {
  }

  @OnEvent('users.*.deleted')
  async onUserDeleted(user: User): Promise<void> {
    await this.trainerService.deleteMany({user: user._id.toString()});
  }

  @OnEvent('regions.*.trainers.*.deleted')
  async onTrainerDeleted(trainer: Trainer): Promise<void> {
    const id = trainer._id.toString();
    await this.trainerService.updateMany({
      'npc.encountered': id,
    }, {
      $pull: {
        'npc.encountered': id,
      },
    });
  }

  @OnEvent('trainers.*.monsters.*.created')
  async onMonsterCreated(monster: Monster): Promise<void> {
    await this.trainerService.update(new Types.ObjectId(monster.trainer), [
      {
        $set: {
          encounteredMonsterTypes: {$setUnion: ['$encounteredMonsterTypes', [monster.type]]},
          team: {$slice: [{$setUnion: ['$team', [monster._id.toString()]]}, MAX_TEAM_SIZE]},
        },
      },
    ]);
  }

  @OnEvent('trainers.*.monsters.*.updated')
  async onMonsterUpdated(monster: Monster): Promise<void> {
    await this.trainerService.update(new Types.ObjectId(monster.trainer), {
      $addToSet: {
        encounteredMonsterTypes: monster.type,
      },
    });
  }

  @OnEvent('trainers.*.monsters.*.deleted')
  async onMonsterDeleted(monster: Monster): Promise<void> {
    await this.trainerService.update(new Types.ObjectId(monster.trainer), {
      $pull: {
        team: monster._id.toString(),
      },
    });
  }
}
