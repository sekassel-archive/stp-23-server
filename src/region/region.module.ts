import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {EventModule} from '@clashsoft/nestx';
import {RegionController} from './region.controller';
import {Region, RegionSchema} from './region.schema';
import {RegionService} from './region.service';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Region.name,
      schema: RegionSchema,
    }]),
    EventModule,
  ],
  controllers: [RegionController],
  providers: [RegionService],
  exports: [RegionService],
})
export class RegionModule {
}
