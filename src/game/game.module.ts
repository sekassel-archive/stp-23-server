import {Module} from '@nestjs/common';
import {AreaModule} from './area/area.module';
import {MonsterModule} from './monster/monster.module';
import {TrainerModule} from './trainer/trainer.module';

@Module({
  imports: [
    AreaModule,
    TrainerModule,
    MonsterModule,
  ],
})
export class GameModule {
}
