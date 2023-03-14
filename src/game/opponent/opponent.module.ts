import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {MonsterModule} from '../monster/monster.module';
import {TrainerModule} from '../trainer/trainer.module';
import {OpponentController} from './opponent.controller';
import {Opponent, OpponentSchema} from './opponent.schema';
import {OpponentService} from './opponent.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Opponent.name,
        schema: OpponentSchema,
      },
    ]),
    MonsterModule,
    TrainerModule,
  ],
  providers: [OpponentService],
  controllers: [OpponentController],
  exports: [OpponentService],
})
export class OpponentModule {
}
