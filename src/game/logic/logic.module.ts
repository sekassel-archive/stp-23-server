import {Module} from '@nestjs/common';
import {RegionModule} from '../../region/region.module';
import {SocketModule} from '../../udp/socket.module';
import {AreaModule} from '../area/area.module';
import {EncounterModule} from '../encounter/encounter.module';
import {MonsterModule} from '../monster/monster.module';
import {OpponentModule} from '../opponent/opponent.module';
import {TrainerModule} from '../trainer/trainer.module';
import {BattleService} from './battle/battle.service';
import {GameLoader} from './game.loader';
import {MonsterGeneratorService} from './monster-generator/monster-generator.service';
import {MovementService} from './movement/movement.service';
import {NpcMovementService} from './npc-movement/npc-movement.service';
import { EncounteredMonsterTypesService } from './encountered-monster-types/encountered-monster-types.service';
import { BattleSetupService } from './battle-setup/battle-setup.service';

@Module({
  imports: [
    RegionModule,
    AreaModule,
    TrainerModule,
    MonsterModule,
    EncounterModule,
    OpponentModule,
    SocketModule,
  ],
  providers: [
    GameLoader,
    MovementService,
    MonsterGeneratorService,
    NpcMovementService,
    BattleService,
    EncounteredMonsterTypesService,
    BattleSetupService,
  ],
})
export class LogicModule {
}
