import {forwardRef, Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";
import {Item, ItemSchema} from "./item.schema";
import {EventModule} from "../../event/event.module";
import {ItemService} from "./item.service";
import {ItemController} from "./item.controller";
import {ItemHandler} from "./item.handler";
import {TrainerModule} from "../trainer/trainer.module";
import {MonsterModule} from "../monster/monster.module";
import {LogicModule} from "../logic/logic.module";
import {OpponentModule} from "../opponent/opponent.module";

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Item.name,
      schema: ItemSchema,
    }]),
    EventModule,
    TrainerModule,
    MonsterModule,
    OpponentModule,
    forwardRef(() => LogicModule),
  ],
  controllers: [ItemController],
  providers: [ItemService, ItemHandler],
  exports: [ItemService],
})
export class ItemModule {
}
