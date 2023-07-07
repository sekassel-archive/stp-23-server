import {forwardRef, Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {EventModule} from '../../event/event.module';
import {EncounterModule} from '../encounter/encounter.module';
import {MonsterModule} from '../monster/monster.module';
import {TrainerModule} from '../trainer/trainer.module';
import {OpponentController} from './opponent.controller';
import {OpponentHandler} from './opponent.handler';
import {Opponent, OpponentSchema} from './opponent.schema';
import {OpponentService} from './opponent.service';
import {environment} from "../../environment";
import {OpponentScheduler} from "./opponent.scheduler";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Opponent.name,
        schema: OpponentSchema,
      },
    ]),
    EventModule,
    MonsterModule,
    TrainerModule,
    forwardRef(() => EncounterModule),
  ],
  providers: [
    OpponentService,
    OpponentHandler,
    ...(environment.passive ? [] : [OpponentScheduler]),
  ],
  controllers: [OpponentController],
  exports: [OpponentService],
})
export class OpponentModule {
}
