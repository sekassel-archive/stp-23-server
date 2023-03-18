import {EventModuleOptions} from '@clashsoft/nestx/src/lib/event/event.module-def';
import {ConfigurableModuleOptionsFactory, Injectable} from '@nestjs/common';
import {Transport} from '@nestjs/microservices';
import {AuthService} from './auth/auth.service';
import {environment} from './environment';

@Injectable()
export class EmofService implements ConfigurableModuleOptionsFactory<EventModuleOptions, 'create'> {
  constructor(
    private readonly authService: AuthService,
  ) {
  }

  create(): Promise<EventModuleOptions> | EventModuleOptions {
    console.log('EmofService.create()');
    return {
      transport: Transport.TCP,
      transportOptions: environment.nats,
      userIdProvider: async msg => (await this.authService.parseUserForWebSocket(msg))?._id?.toString(),
    };
  }

}
