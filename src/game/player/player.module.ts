import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';

import {EventModule} from '../../event/event.module';
import {SocketModule} from '../../udp/socket.module';
import {PlayerController} from './player.controller';
import {PlayerHandler} from './player.handler';
import {Player, PlayerSchema} from './player.schema';
import {PlayerService} from './player.service';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Player.name,
      schema: PlayerSchema,
    }]),
    EventModule,
    SocketModule,
  ],
  controllers: [PlayerController],
  providers: [PlayerService, PlayerHandler],
  exports: [PlayerService],
})
export class PlayerModule {
}
