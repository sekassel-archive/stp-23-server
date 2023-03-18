import {EventModule} from '@clashsoft/nestx';
import {Module} from '@nestjs/common';
import {Transport} from '@nestjs/microservices';
import {MongooseModule} from '@nestjs/mongoose';
import {ScheduleModule} from '@nestjs/schedule';
import {ThrottlerModule} from '@nestjs/throttler';

import {AuthModule} from './auth/auth.module';
import {AuthService} from './auth/auth.service';
import {environment} from './environment';
import {GroupModule} from './group/group.module';
import {MessageModule} from './message/message.module';
import {RegionModule} from './region/region.module';
import {UserModule} from './user/user.module';

@Module({
  imports: [
    MongooseModule.forRoot(environment.mongo.uri, {
      ignoreUndefined: true,
    }),
    ThrottlerModule.forRoot(environment.rateLimit),
    ScheduleModule.forRoot(),
    AuthModule,
    EventModule.forRootAsync({
      imports: [AuthModule],
      inject: [AuthService],
      useFactory: (authService: AuthService) => ({
        transport: Transport.TCP,
        transportOptions: environment.nats,
        userIdProvider: async msg => (await authService.parseUserForWebSocket(msg))?._id?.toString(),
      }),
    }),
    UserModule,
    // AchievementSummaryModule,
    // AchievementModule,
    GroupModule,
    MessageModule,
    RegionModule,
  ],
})
export class AppModule {
}
