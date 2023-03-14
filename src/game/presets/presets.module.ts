import {Module} from '@nestjs/common';
import {PresetsController} from './presets.controller';
import {PresetsService} from './presets.service';

@Module({
  controllers: [PresetsController],
  providers: [PresetsService],
})
export class PresetsModule {
}
