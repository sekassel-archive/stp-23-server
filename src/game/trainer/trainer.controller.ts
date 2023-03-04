import {Body, Controller, Get, Param, Post, Query} from '@nestjs/common';
import {ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger';
import {Auth, AuthUser} from '../../auth/auth.decorator';
import {UserToken} from '../../auth/auth.interface';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {MONGO_ID_FORMAT} from '../../util/schema';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {CreateTrainerDto} from './trainer.dto';
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

  @Post()
  @ApiCreatedResponse({type: Trainer})
  async create(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Body() dto: CreateTrainerDto,
    @AuthUser() user: UserToken,
  ): Promise<Trainer> {
    return this.trainerService.create(regionId, user.sub, dto);
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
