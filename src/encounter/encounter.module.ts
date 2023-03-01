import {Module} from '@nestjs/common';
import {MonsterModule} from '../monster/monster.module';
import {EncounterController} from './encounter.controller';
import {EncounterService} from './encounter.service';

@Module({
  imports: [MonsterModule],
  providers: [EncounterService],
  controllers: [EncounterController],
  exports: [EncounterService],
})
export class EncounterModule {
}
