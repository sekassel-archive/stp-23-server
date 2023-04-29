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
    await Promise.all([
      this.itemService.getStarterItems(trainer, 1), // Mondex
      this.itemService.getStarterItems(trainer, 2), // Moneybag
      this.itemService.getStarterItems(trainer, 3), // Backpack
      this.itemService.getStarterItems(trainer, 10, 10), // Monballs
      this.itemService.getStarterItems(trainer, 20, 3), // Chocolate
      this.itemService.getStarterItems(trainer, 21), // Chicken leg
      this.itemService.getStarterItems(trainer, 30), // Mystery box
    ]);
  }

  @OnEvent('regions.*.trainers.*.deleted')
  async onTrainerDeleted(trainer: Trainer): Promise<void> {
    await this.itemService.deleteTrainer(trainer._id.toString());
  }
}
