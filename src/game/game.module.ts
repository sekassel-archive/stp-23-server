import {Module} from '@nestjs/common';
import {AreaModule} from './area/area.module';
import {MonsterModule} from './monster/monster.module';
import {PlayerModule} from './player/player.module';

@Module({
  imports: [
    AreaModule,
    PlayerModule,
    MonsterModule,
  ],
})
export class GameModule {
}
