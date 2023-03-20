import {Body, Controller, ForbiddenException, Get, Param, Patch, Query} from '@nestjs/common';
import {ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger';
import {Auth, AuthUser} from '../../auth/auth.decorator';
import {UserToken} from '../../auth/auth.interface';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {TrainerService} from '../trainer/trainer.service';
import {UpdateOpponentDto} from './opponent.dto';
import {Opponent} from './opponent.schema';
import {OpponentService} from './opponent.service';

@Controller('regions/:regionId')
@ApiTags('Encounter Opponents')
@Validated()
@Auth()
@Throttled()
export class OpponentController {
  constructor(
    private readonly opponentService: OpponentService,
    private readonly trainerService: TrainerService,
  ) {
  }

  @Get('opponents')
  @ApiQuery({name: 'trainer', required: false})
  @ApiOkResponse({type: [Opponent]})
  async findAll(
    @Param('regionId', ParseObjectIdPipe) region: string,
    @Query('trainer') trainer?: string,
  ): Promise<Opponent[]> {
    return this.opponentService.findAll({region, trainer});
  }

  @Get('encounters/:encounterId/opponents')
  @ApiOkResponse({type: [Opponent]})
  async findByEncounter(
    @Param('regionId', ParseObjectIdPipe) region: string,
    @Param('encounterId', ParseObjectIdPipe) encounter: string,
  ): Promise<Opponent[]> {
    return this.opponentService.findAll({region, encounter});
  }

  @Get('encounters/:encounterId/opponents/:trainerId')
  @ApiOkResponse({type: Opponent})
  @NotFound()
  async findOne(
    @Param('encounterId', ParseObjectIdPipe) encounter: string,
    @Param('trainerId', ParseObjectIdPipe) trainer: string,
  ): Promise<Opponent | null> {
    return this.opponentService.findOne(encounter, trainer);
  }

  @Patch('encounters/:encounterId/opponents/:trainerId')
  @ApiOkResponse({type: Opponent})
  @NotFound()
  async updateOne(
    @Param('encounterId', ParseObjectIdPipe) encounter: string,
    @Param('trainerId', ParseObjectIdPipe) trainer: string,
    @Body() dto: UpdateOpponentDto,
    @AuthUser() user: UserToken,
  ): Promise<Opponent | null> {
    const opponent = await this.opponentService.findOne(encounter, trainer);
    if (!opponent) {
      return null;
    }
    const trainerDoc = await this.trainerService.findOne(opponent.trainer);
    if (!trainerDoc) {
      return null;
    }
    if (trainerDoc.user?.toString() !== user.sub) {
      throw new ForbiddenException('You are not the trainer of this opponent');
    }
    return this.opponentService.updateOne(encounter, trainer, dto);
  }
}
