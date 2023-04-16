import {Module} from '@nestjs/common';
import {RegionModule} from '../region/region.module';
import {AreaModule} from './area/area.module';
import {EncounterModule} from './encounter/encounter.module';
import {LogicModule} from './logic/logic.module';
import {MonsterModule} from './monster/monster.module';
import {PresetsModule} from './presets/presets.module';
import {TrainerModule} from './trainer/trainer.module';

@Module({
  imports: [
    RegionModule,
    AreaModule,
    TrainerModule,
    MonsterModule,
    PresetsModule,
    EncounterModule,
    LogicModule,
  ],
})
export class GameModule {
}
