import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { environment } from '../environment';
import { EventModule } from '../event/event.module';
import { GameController } from './game.controller';
import { GameHandler } from './game.handler';
import { GameScheduler } from './game.scheduler';
import { GameSchema } from './game.schema';
import { GameService } from './game.service';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: 'games',
      schema: GameSchema,
    }]),
    EventModule,
  ],
  controllers: [GameController],
  providers: [
    GameService,
    GameHandler,
    ...(environment.passive ? [] : [GameScheduler]),
  ],
  exports: [GameService],
})
export class GameModule {
}
