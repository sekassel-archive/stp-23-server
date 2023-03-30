import {Injectable} from "@nestjs/common";
import {ItemService} from "./item.service";
import {OnEvent} from "@nestjs/event-emitter";
import {Trainer} from "../trainer/trainer.schema";

@Injectable()
export class ItemHandler {
  constructor(
    private itemService: ItemService,
  ) {
  }

  @OnEvent('regions.*.trainers.*.created')
  async onTrainerCreated(trainer: Trainer): Promise<void> {
    await this.itemService.updateOne(trainer, {type: 1, amount: 20});
  }

  @OnEvent('regions.*.trainers.*.deleted')
  async onTrainerDeleted(trainer: Trainer): Promise<void> {
    await this.itemService.deleteTrainer(trainer._id.toString());
  }
}
