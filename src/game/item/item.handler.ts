import {Injectable} from "@nestjs/common";
import {ItemService} from "./item.service";
import {OnEvent} from "@nestjs/event-emitter";
import {Trainer} from "../trainer/trainer.schema";
import {ItemAction} from "./item.action";

@Injectable()
export class ItemHandler {
  constructor(
    private itemService: ItemService,
  ) {
  }

  @OnEvent('regions.*.trainers.*.created')
  async onTrainerCreated(trainer: Trainer): Promise<void> {
    await this.itemService.getStarterItems(trainer, {type: 5, amount: 1, action: ItemAction.TRADE});
    await this.itemService.getStarterItems(trainer, {type: 7, amount: 1, action: ItemAction.TRADE});
    await this.itemService.getStarterItems(trainer, {type: 1, amount: 20, action: ItemAction.TRADE});
  }

  @OnEvent('regions.*.trainers.*.deleted')
  async onTrainerDeleted(trainer: Trainer): Promise<void> {
    await this.itemService.deleteTrainer(trainer._id.toString());
  }
}
