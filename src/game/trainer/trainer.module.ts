import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';

import {EventModule} from '../../event/event.module';
import {RegionModule} from '../../region/region.module';
import {SocketModule} from '../../udp/socket.module';
import {AreaModule} from '../area/area.module';
import {TrainerController} from './trainer.controller';
import {TrainerHandler} from './trainer.handler';
import {Trainer, TrainerSchema} from './trainer.schema';
import {TrainerService} from './trainer.service';
import {TrainerScheduler} from "./trainer.scheduler";
import {environment} from "../../environment";

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Trainer.name,
      schema: TrainerSchema,
    }]),
    EventModule,
    SocketModule,
    RegionModule,
    AreaModule,
  ],
  controllers: [TrainerController],
  providers: [
    TrainerService,
    TrainerHandler,
    ...(environment.passive ? [] : [TrainerScheduler]),
  ],
  exports: [TrainerService],
})
export class TrainerModule {
}
