import {Module} from '@nestjs/common';
import {RegionModule} from '../../region/region.module';
import {SocketModule} from '../../udp/socket.module';
import {AreaModule} from '../area/area.module';
import {MonsterModule} from '../monster/monster.module';
import {TrainerModule} from '../trainer/trainer.module';
import {GameLoader} from './game.loader';
import {MonsterGeneratorService} from './monster-generator/monster-generator.service';
import {MovementService} from './movement/movement.service';
import {NpcMovementService} from './npc-movement/npc-movement.service';

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
    NpcMovementService,
  ],
})
export class LogicModule {
}
