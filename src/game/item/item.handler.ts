import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Trainer} from '../trainer/trainer.schema';
import {ItemService} from './item.service';

@Injectable()
export class ItemHandler {
  constructor(
    private itemService: ItemService,
  ) {
  }

  @OnEvent('regions.*.trainers.*.created')
  async onTrainerCreated(trainer: Trainer): Promise<void> {
    if (trainer.npc) {
      return;
    }

    const trainerId = trainer._id.toString();
    await Promise.all([
      this.itemService.updateAmount(trainerId, 1, 1), // Mondex
      this.itemService.updateAmount(trainerId, 2, 1), // Moneybag
      this.itemService.updateAmount(trainerId, 3, 1), // Backpack
      this.itemService.updateAmount(trainerId, 10, 10), // Monballs
      this.itemService.updateAmount(trainerId, 20, 3), // Chocolate
      this.itemService.updateAmount(trainerId, 21, 1), // Chicken leg
      this.itemService.updateAmount(trainerId, 30, 1), // Mystery box
    ]);
  }

  @OnEvent('regions.*.trainers.*.deleted')
  async onTrainerDeleted(trainer: Trainer): Promise<void> {
    await this.itemService.deleteTrainer(trainer._id.toString());
  }
}
