import {Module} from '@nestjs/common';
import {MonsterModule} from '../monster/monster.module';
import {EncounterService} from './encounter.service';

@Module({
  imports: [MonsterModule],
  providers: [EncounterService],
})
export class EncounterModule {
}
