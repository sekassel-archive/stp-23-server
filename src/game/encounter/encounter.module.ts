import {forwardRef, Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {EventModule} from '../../event/event.module';
import {MonsterModule} from '../monster/monster.module';
import {OpponentModule} from '../opponent/opponent.module';
import {EncounterController} from './encounter.controller';
import {EncounterHandler} from './encounter.handler';
import {Encounter, EncounterSchema} from './encounter.schema';
import {EncounterService} from './encounter.service';
import {TrainerModule} from "../trainer/trainer.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Encounter.name,
        schema: EncounterSchema,
      },
    ]),
    EventModule,
    MonsterModule,
    TrainerModule,
    forwardRef(() => OpponentModule),
  ],
  providers: [EncounterService, EncounterHandler],
  controllers: [EncounterController],
  exports: [EncounterService],
})
export class EncounterModule {
}
