import {Body, Controller, ForbiddenException, Get, Param, Patch} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth, AuthUser} from '../../auth/auth.decorator';
import {UserToken} from '../../auth/auth.interface';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {PlayerService} from '../player/player.service';
import {UpdateOpponentDto} from './opponent.dto';
import {Opponent} from './opponent.schema';
import {OpponentService} from './opponent.service';

@Controller('regions/:regionId/encounters/:encounterId/opponents')
@ApiTags('Encounter Opponents')
@Validated()
@Auth()
@Throttled()
export class OpponentController {
  constructor(
    private readonly opponentService: OpponentService,
    private readonly playerService: PlayerService,
  ) {
  }

  @Get()
  @ApiOkResponse({type: [Opponent]})
  async findAll(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('encounterId', ParseObjectIdPipe) encounterId: string,
  ): Promise<Opponent[]> {
    return this.opponentService.findAll(regionId, encounterId);
  }

  @Get(':id')
  @ApiOkResponse({type: Opponent})
  @NotFound()
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Opponent | null> {
    return this.opponentService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({type: Opponent})
  @NotFound()
  async updateOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateOpponentDto,
    @AuthUser() user: UserToken,
  ): Promise<Opponent | null> {
    const opponent = await this.opponentService.findOne(id);
    if (!opponent) {
      return null;
    }
    const trainer = await this.playerService.findOne(opponent.trainer);
    if (!trainer) {
      return null;
    }
    if (trainer.user?.toString() !== user.sub) {
      throw new ForbiddenException('You are not the trainer of this opponent');
    }
    return this.opponentService.updateOne(id, dto);
  }
}
