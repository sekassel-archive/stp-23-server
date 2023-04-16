import {Module} from '@nestjs/common';
import {RegionModule} from '../../region/region.module';
import {SocketModule} from '../../udp/socket.module';
import {AreaModule} from '../area/area.module';
import {TrainerModule} from '../trainer/trainer.module';
import {GameLoader} from './game.loader';
import {MovementService} from './movement/movement.service';

@Module({
  imports: [
    RegionModule,
    AreaModule,
    TrainerModule,
    SocketModule,
  ],
  providers: [
    GameLoader,
    MovementService,
  ],
})
export class LogicModule {
}
