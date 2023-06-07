import {Body, Controller, Delete, ForbiddenException, Get, Param, Put} from '@nestjs/common';
import {ApiForbiddenResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth, AuthUser} from '../auth/auth.decorator';
import {User} from '../user/user.schema';
import {NotFound} from '../util/not-found.decorator';
import {ParseObjectIdPipe} from '../util/parse-object-id.pipe';
import {Throttled} from '../util/throttled.decorator';
import {Validated} from '../util/validated.decorator';
import {UpdateAchievementDto} from './achievement.dto';
import {Achievement} from './achievement.schema';
import {AchievementService} from './achievement.service';

@Controller('users/:user/achievements')
@ApiTags('Achievements')
@Validated()
@Auth()
@Throttled()
export class AchievementController {
  constructor(
    private readonly achievementService: AchievementService,
  ) {
  }

  @Get()
  @ApiOkResponse({ type: [Achievement] })
  async findAll(
    @Param('user', ParseObjectIdPipe) user: string,
  ): Promise<Achievement[]> {
    return this.achievementService.findAll({user});
  }

  @Get(':id')
  @ApiOkResponse({ type: Achievement })
  @NotFound()
  async findOne(
    @Param('user', ParseObjectIdPipe) user: string,
    @Param('id') id: string,
  ): Promise<Achievement | null> {
    return this.achievementService.findOne({user, id});
  }

  @Put(':id')
  @ApiOkResponse({ type: Achievement })
  @ApiForbiddenResponse({ description: 'Adding an achievement to another user.' })
  async create(
    @AuthUser() user: User,
    @Param('user', ParseObjectIdPipe) userId: string,
    @Param('id') id: string,
    @Body() achievement: UpdateAchievementDto,
  ): Promise<Achievement> {
    if (user._id.toString() !== userId) {
      throw new ForbiddenException('Cannot add achievement for another user.');
    }
    return this.achievementService.upsert({user: userId, id}, achievement);
  }

  @Delete(':id')
  @ApiOkResponse({ type: Achievement })
  @ApiForbiddenResponse({ description: 'Attempt to delete achievement of another user.' })
  @NotFound()
  async delete(
    @AuthUser() user: User,
    @Param('user', ParseObjectIdPipe) userId: string,
    @Param('id') id: string,
  ): Promise<Achievement | null> {
    if (user._id.toString() !== userId) {
      throw new ForbiddenException('Cannot delete achievement of another user.');
    }
    return this.achievementService.deleteOne({user: userId, id});
  }
}
