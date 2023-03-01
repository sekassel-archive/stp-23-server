import {Module} from '@nestjs/common';
import {AreaModule} from './area/area.module';
import {EncounterModule} from './encounter/encounter.module';
import {MonsterModule} from './monster/monster.module';
import {PlayerModule} from './player/player.module';

@Module({
  imports: [
    AreaModule,
    PlayerModule,
    MonsterModule,
    EncounterModule,
  ],
})
export class GameModule {
}
