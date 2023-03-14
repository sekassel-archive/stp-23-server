import {Module} from '@nestjs/common';
import {RegionModule} from '../region/region.module';
import {AreaModule} from './area/area.module';
import {EncounterModule} from './encounter/encounter.module';
import {GameLoader} from './game.loader';
import {MonsterModule} from './monster/monster.module';
import {TrainerModule} from './trainer/trainer.module';
import { PresetsModule } from './presets/presets.module';

@Module({
  imports: [
    RegionModule,
    AreaModule,
    TrainerModule,
    MonsterModule,
    PresetsModule,
    EncounterModule,
  ],
  providers: [
    GameLoader,
  ],
})
export class GameModule {
}
