import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
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
  ],
  providers: [OpponentService],
  controllers: [OpponentController],
  exports: [OpponentService],
})
export class OpponentModule {
}
