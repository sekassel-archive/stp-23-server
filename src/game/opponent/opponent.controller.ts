import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger';
import {Auth, AuthUser} from '../../auth/auth.decorator';
import {User} from '../../user/user.schema';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {EncounterService} from '../encounter/encounter.service';
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
    private readonly encounterService: EncounterService,
  ) {
  }

  @Get('opponents')
  @ApiQuery({name: 'trainer'})
  @ApiOkResponse({type: [Opponent]})
  async findAll(
    @Query('trainer') trainer: string,
  ): Promise<Opponent[]> {
    return this.opponentService.findAll({trainer});
  }

  @Get('encounters/:encounterId/opponents')
  @ApiOkResponse({type: [Opponent]})
  async findByEncounter(
    @Param('encounterId', ParseObjectIdPipe) encounter: string,
  ): Promise<Opponent[]> {
    return this.opponentService.findAll({encounter});
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
  @ApiForbiddenResponse({description: 'You cannot modify another trainer\'s opponent'})
  @NotFound()
  async updateOne(
    @Param('encounterId', ParseObjectIdPipe) encounter: string,
    @Param('trainerId', ParseObjectIdPipe) trainer: string,
    @Body() dto: UpdateOpponentDto,
    @AuthUser() user: User,
  ): Promise<Opponent | null> {
    await this.checkTrainerAccess(trainer, user);
    return this.opponentService.updateOne(encounter, trainer, dto);
  }

  @Delete('encounters/:encounterId/opponents/:trainerId')
  @ApiOkResponse({type: Opponent})
  @ApiForbiddenResponse({description: 'You cannot make another trainer flee, or flee from a trainer encounter'})
  @NotFound()
  async deleteOne(
    @Param('encounterId', ParseObjectIdPipe) encounter: string,
    @Param('trainerId', ParseObjectIdPipe) trainer: string,
    @AuthUser() user: User,
  ): Promise<Opponent | null> {
    await this.checkTrainerAccess(trainer, user);
    const encounterDoc = await this.encounterService.findOne(encounter);
    if (!encounterDoc) {
      throw new NotFoundException('Encounter not found');
    }
    if (!encounterDoc.isWild) {
      throw new ForbiddenException('You cannot flee from a trainer encounter');
    }
    return this.opponentService.deleteOne(encounter, trainer);
  }

  private async checkTrainerAccess(trainer: string, user: User) {
    const trainerDoc = await this.trainerService.findOne(trainer);
    if (!trainerDoc) {
      throw new NotFoundException('Trainer not found');
    }
    if (!user._id.equals(trainerDoc.user)) {
      throw new ForbiddenException('You are not the trainer of this opponent');
    }
  }
}
