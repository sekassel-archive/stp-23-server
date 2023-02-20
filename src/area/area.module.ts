import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {EventModule} from '../event/event.module';
import {AreaController} from './area.controller';
import {Area, AreaSchema} from './area.schema';
import {AreaService} from './area.service';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Area.name,
      schema: AreaSchema,
    }]),
    EventModule,
  ],
  controllers: [AreaController],
  providers: [AreaService],
  exports: [AreaService],
})
export class AreaModule {
}
