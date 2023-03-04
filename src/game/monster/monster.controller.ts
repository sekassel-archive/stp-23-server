import {Controller, Get, Param} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth} from '../../auth/auth.decorator';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {Monster} from './monster.schema';
import {MonsterService} from './monster.service';

@Controller('regions/:regionId/trainers/:trainerId/monsters')
@ApiTags('Trainer Monsters')
@Validated()
@Auth()
@Throttled()
export class MonsterController {
  constructor(
    private readonly monsterService: MonsterService,
  ) {
  }

  @Get()
  @ApiOkResponse({type: [Monster]})
  async findAll(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('trainerId', ParseObjectIdPipe) trainerId: string,
  ): Promise<Monster[]> {
    return this.monsterService.findAll(regionId, trainerId);
  }

  @Get(':id')
  @ApiOkResponse({type: Monster})
  @NotFound()
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Monster | null> {
    return this.monsterService.findOne(id);
  }
}
