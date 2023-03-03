import {Controller, Get, Param} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth} from '../../auth/auth.decorator';
import {RegionService} from '../../region/region.service';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {Player} from './player.schema';
import {PlayerService} from './player.service';

@Controller('regions/:regionId/players')
@ApiTags('Region Players')
@Validated()
@Auth()
@Throttled()
export class PlayerController {
  constructor(
    private readonly playerService: PlayerService,
  ) {
  }

  @Get()
  @ApiOkResponse({type: [Player]})
  async findAll(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
  ): Promise<Player[]> {
    return this.playerService.findAll(regionId);
  }

  @Get(':userId')
  @ApiOkResponse({type: Player})
  @NotFound()
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Player | null> {
    return this.playerService.findOne(id);
  }
}
