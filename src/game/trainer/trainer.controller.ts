import {Controller, Get, Param, Query} from '@nestjs/common';
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger';
import {Auth} from '../../auth/auth.decorator';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {MONGO_ID_FORMAT} from '../../util/schema';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {Trainer} from './trainer.schema';
import {TrainerService} from './trainer.service';

@Controller('regions/:regionId/trainers')
@ApiTags('Region Trainers')
@Validated()
@Auth()
@Throttled()
export class TrainerController {
  constructor(
    private readonly trainerService: TrainerService,
  ) {
  }

  @Get()
  @ApiOkResponse({type: [Trainer]})
  @ApiQuery({...MONGO_ID_FORMAT, name: 'area', required: false, description: 'Filter by area'})
  async findAll(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Query('area', ParseObjectIdPipe) area?: string,
  ): Promise<Trainer[]> {
    return this.trainerService.findAll(regionId, {area});
  }

  @Get(':id')
  @ApiOkResponse({type: Trainer})
  @NotFound()
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Trainer | null> {
    return this.trainerService.findOne(id);
  }
}
