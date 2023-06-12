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
import {SentryInterceptor, SentryModule, SentryModuleOptions} from "@ntegral/nestjs-sentry";
import {APP_INTERCEPTOR, HttpAdapterHost} from "@nestjs/core";
import {AchievementModule} from "./achievement/achievement.module";
import {AchievementSummaryModule} from "./achievement-summary/achievement-summary.module";
import {Integrations} from "@sentry/node";

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
    SentryModule.forRootAsync({
      inject: [HttpAdapterHost],
      useFactory: async (adapterHost: HttpAdapterHost) => ({
        dsn: environment.sentry.dsn,
        environment: environment.nodeEnv,
        release: environment.version,
        tracesSampleRate: environment.sentry.tracesSampleRate,
        integrations: [
          new Integrations.Http({tracing: true}),
          new Integrations.Express({
            app: adapterHost.httpAdapter.getInstance(),
          }),
        ],
      } satisfies SentryModuleOptions),
    }),
    AuthModule,
    EventModule,
    SocketModule,
    UserModule,
    AchievementSummaryModule,
    AchievementModule,
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
