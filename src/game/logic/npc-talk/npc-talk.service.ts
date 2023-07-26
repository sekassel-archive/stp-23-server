import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {MonsterService} from '../../monster/monster.service';
import {TalkTrainerDto} from '../../trainer/trainer.dto';
import {TrainerService} from '../../trainer/trainer.service';
import {BattleSetupService} from '../battle-setup/battle-setup.service';
import {MonsterGeneratorService} from '../monster-generator/monster-generator.service';
import {MovementService} from '../movement/movement.service';
import {ValidatedEvent} from "../../../util/validated.decorator";
import {STARTER_LEVEL} from "../../constants";
import {ItemService} from "../../item/item.service";

@Injectable()
export class NpcTalkService {
  constructor(
    private trainerService: TrainerService,
    private monsterService: MonsterService,
    private monsterGeneratorService: MonsterGeneratorService,
    private battleSetupService: BattleSetupService,
    private movementService: MovementService,
    private itemService: ItemService,
  ) {
  }

  @OnEvent('udp:areas.*.trainers.*.talked')
  @ValidatedEvent()
  async onTrainerTalked(dto: TalkTrainerDto) {
    const trainerId = dto._id.toString();
    const [trainer, target] = await Promise.all([
      this.trainerService.find(dto._id),
      this.trainerService.find(dto.target),
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
        await this.trainerService.update(dto.target, {
          $addToSet: {'npc.encountered': trainerId},
        });
        await this.monsterGeneratorService.createAuto(trainerId, starterId, STARTER_LEVEL);
      }
    }
    if (target.npc.encounterOnTalk) {
      await this.battleSetupService.createTrainerBattle(target, [trainer]);
    } else if (target.npc.gifts && !target.npc.encountered?.includes(trainerId)) {
      await this.trainerService.update(dto.target, {
        $addToSet: {'npc.encountered': trainerId},
      });
      await Promise.all(target.npc.gifts.map(async gift => this.itemService.getStarterItems(trainer, gift, 1)));
    }
  }
}
