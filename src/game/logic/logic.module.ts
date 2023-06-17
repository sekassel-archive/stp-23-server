import {Module} from '@nestjs/common';
import {RegionModule} from '../../region/region.module';
import {SocketModule} from '../../udp/socket.module';
import {AreaModule} from '../area/area.module';
import {MonsterModule} from '../monster/monster.module';
import {TrainerModule} from '../trainer/trainer.module';
import {GameLoader} from './game.loader';
import {MonsterGeneratorService} from './monster-generator/monster-generator.service';
import {MovementService} from './movement/movement.service';
import {NpcMovementScheduler} from './npc-movement/npc-movement.scheduler';
import {environment} from "../../environment";

@Module({
  imports: [
    RegionModule,
    AreaModule,
    TrainerModule,
    MonsterModule,
    SocketModule,
  ],
  providers: [
    GameLoader,
    MovementService,
    MonsterGeneratorService,
    ...(environment.passive ? [] : [NpcMovementScheduler]),
  ],
})
export class LogicModule {
}
