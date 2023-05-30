import {HttpException, Module} from '@nestjs/common';
import {EventEmitterModule} from '@nestjs/event-emitter';
import {MongooseModule} from '@nestjs/mongoose';
import {ScheduleModule} from '@nestjs/schedule';
import {ThrottlerModule} from '@nestjs/throttler';
import {SocketModule} from './udp/socket.module';

import {AuthModule} from './auth/auth.module';
import {environment} from './environment';
import {EventModule} from './event/event.module';
import {GameModule} from './game/game.module';
import {GroupModule} from './group/group.module';
import {MessageModule} from './message/message.module';
import {RegionModule} from './region/region.module';
import {UserModule} from './user/user.module';
import {SentryInterceptor, SentryModule} from "@ntegral/nestjs-sentry";
import {APP_INTERCEPTOR} from "@nestjs/core";

@Module({
  imports: [
    MongooseModule.forRoot(environment.mongo.uri, {
      ignoreUndefined: true,
    }),
    ThrottlerModule.forRoot(environment.rateLimit),
    EventEmitterModule.forRoot({
      wildcard: true,
    }),
    ScheduleModule.forRoot(),
    SentryModule.forRoot({
      dsn: environment.sentryDsn,
      environment: environment.nodeEnv,
      release: environment.version,
    }),
    AuthModule,
    EventModule,
    SocketModule,
    UserModule,
    // AchievementSummaryModule,
    // AchievementModule,
    GroupModule,
    MessageModule,
    RegionModule,
    GameModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new SentryInterceptor({
        filters: [{
          type: HttpException,
          filter: (exception: HttpException) => 500 > exception.getStatus(),
        }],
      }),
    }
  ]
})
export class AppModule {
}
