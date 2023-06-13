import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {MonsterService} from '../../monster/monster.service';
import {TalkTrainerDto} from '../../trainer/trainer.dto';
import {TrainerService} from '../../trainer/trainer.service';
import {BattleSetupService} from '../battle-setup/battle-setup.service';
import {MonsterGeneratorService} from '../monster-generator/monster-generator.service';
import {MovementService} from '../movement/movement.service';
import {Types} from "mongoose";

@Injectable()
export class NpcTalkService {
  constructor(
    private trainerService: TrainerService,
    private monsterService: MonsterService,
    private monsterGeneratorService: MonsterGeneratorService,
    private battleSetupService: BattleSetupService,
    private movementService: MovementService,
  ) {
  }

  @OnEvent('udp:areas.*.trainers.*.talked')
  async onTrainerTalked(dto: TalkTrainerDto) {
    const trainerId = dto._id.toString();
    const targetId = dto.target;
    const target_id = new Types.ObjectId(targetId);
    const [trainer, target] = await Promise.all([
      this.trainerService.find(dto._id),
      this.trainerService.find(target_id),
    ]);
    if (!trainer || !target || trainer.area !== target.area || this.movementService.getDistance(trainer, target) > 2) {
      return;
    }

    if (!target.npc) {
      await this.battleSetupService.createTrainerBattle(target, [trainer]);
      return;
    }

    if (target.npc.canHeal) {
      await this.monsterService.healAll({trainer: trainerId});
    }
    if (target.npc.starters && dto.selection != null && !target.npc.encountered?.includes(trainerId)) {
      const starterId = target.npc.starters[dto.selection];
      if (starterId) {
        await this.trainerService.update(target_id, {
          $addToSet: {'npc.encountered': trainerId},
        });
        await this.monsterGeneratorService.createAuto(trainerId, starterId, 1);
        await this.trainerService.update(dto._id, {
          $addToSet: {
            encounteredMonsterTypes: starterId,
          },
        });
      }
    }
    if (target.npc.encounterOnSight) {
      await this.trainerService.update(target_id, {
        $addToSet: {'npc.encountered': trainerId},
      });
      await this.battleSetupService.createTrainerBattle(target, [trainer]);
    }
  }
}
