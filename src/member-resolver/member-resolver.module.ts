import {Module} from '@nestjs/common';
import {TrainerModule} from '../game/trainer/trainer.module';
import {GroupModule} from '../group/group.module';
import {MemberResolverService} from './member-resolver.service';

@Module({
  imports: [
    GroupModule,
    TrainerModule,
  ],
  providers: [MemberResolverService],
  exports: [MemberResolverService],
})
export class MemberResolverModule {
}
