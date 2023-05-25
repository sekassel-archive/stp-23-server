import {Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {Auth, AuthUser} from '../../auth/auth.decorator';
import {User} from '../../user/user.schema';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {MONGO_ID_FORMAT} from '../../util/schema';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {CreateTrainerDto, MoveTrainerDto} from './trainer.dto';
import {Trainer} from './trainer.schema';
import {TrainerService} from './trainer.service';

@Controller('regions/:region/trainers')
@ApiTags('Region Trainers')
@ApiExtraModels(MoveTrainerDto)
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
  @ApiConflictResponse({description: 'Trainer for current user already exists'})
  async create(
    @Param('region', ParseObjectIdPipe) region: string,
    @Body() dto: CreateTrainerDto,
    @AuthUser() user: User,
  ): Promise<Trainer> {
    return this.trainerService.create(region, user._id.toString(), dto);
  }

  @Get()
  @ApiOkResponse({type: [Trainer]})
  @ApiQuery({...MONGO_ID_FORMAT, name: 'area', required: false, description: 'Filter by area'})
  @ApiQuery({...MONGO_ID_FORMAT, name: 'user', required: false, description: 'Filter by user'})
  async findAll(
    @Param('region', ParseObjectIdPipe) region: string,
    @Query('area', ParseObjectIdPipe) area?: string,
    @Query('user', ParseObjectIdPipe) user?: string,
  ): Promise<Trainer[]> {
    return this.trainerService.findAll({region, area, user});
  }

  @Get(':id')
  @ApiOkResponse({type: Trainer})
  @NotFound()
  async findOne(
    @Param('region', ParseObjectIdPipe) region: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Trainer | null> {
    return this.trainerService.findOne(id);
  }

  @Delete(':id')
  @ApiOkResponse({type: Trainer})
  @ApiForbiddenResponse({description: 'Cannot delete someone else\'s trainer'})
  @NotFound()
  async deleteOne(
    @Param('region', ParseObjectIdPipe) region: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @AuthUser() user: User,
  ): Promise<Trainer | null> {
    const trainer = await this.trainerService.findOne(id);
    if (trainer?.user !== user._id.toString()) {
      throw new ForbiddenException('Cannot delete someone else\'s trainer');
    }
    return this.trainerService.delete(id);
  }
}
