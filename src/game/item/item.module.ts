import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";
import {Item, ItemSchema} from "./item.schema";
import {EventModule} from "../../event/event.module";
import {ItemService} from "./item.service";
import {ItemController} from "./item.controller";
import {ItemHandler} from "./item.handler";
import {TrainerModule} from "../trainer/trainer.module";

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Item.name,
      schema: ItemSchema,
    }]),
    EventModule,
    TrainerModule,
  ],
  controllers: [ItemController],
  providers: [ItemService, ItemHandler],
  exports: [ItemService],
})
export class ItemModule {
}
