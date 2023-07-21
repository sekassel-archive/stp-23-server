import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';

import {EventModule} from '../../event/event.module';
import {MonsterController} from './monster.controller';
import {MonsterHandler} from './monster.handler';
import {Monster, MonsterSchema} from './monster.schema';
import {MonsterService} from './monster.service';
import {TrainerModule} from "../trainer/trainer.module";

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Monster.name,
      schema: MonsterSchema,
    }]),
    EventModule,
    TrainerModule,
  ],
  controllers: [MonsterController],
  providers: [MonsterService, MonsterHandler],
  exports: [MonsterService],
})
export class MonsterModule {
}
