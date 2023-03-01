import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';

import {EventModule} from '../event/event.module';
import {MemberController} from './member.controller';
import {MemberHandler} from './member.handler';
import {Member, MemberSchema} from './member.schema';
import {MemberService} from './member.service';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Member.name,
      schema: MemberSchema,
    }]),
    EventModule,
  ],
  controllers: [MemberController],
  providers: [MemberService, MemberHandler],
  exports: [MemberService],
})
export class MemberModule {
}
