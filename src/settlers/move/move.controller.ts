import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../auth/auth.decorator';
import { MemberAuth } from '../../member/member-auth.decorator';
import { User } from '../../user/user.schema';
import { NotFound } from '../../util/not-found.decorator';
import { ParseObjectIdPipe } from '../../util/parse-object-id.pipe';
import { Throttled } from '../../util/throttled.decorator';
import { Validated } from '../../util/validated.decorator';
import { GameLogicService } from './game-logic/game-logic.service';
import { CreateMoveDto } from './move.dto';
import { Move } from './move.schema';
import { MoveService } from './move.service';

@Controller('games/:gameId/moves')
@ApiTags('Pioneers')
@Validated()
@Throttled()
@MemberAuth()
export class MoveController {
  constructor(
    private gameLogicService: GameLogicService,
    private moveService: MoveService,
  ) {
  }

  @Post()
  @ApiCreatedResponse({ type: Move })
  @ApiForbiddenResponse({ description: 'Not a member of this game, not your turn or action does not match game state.' })
  @NotFound('Game not found or not running.')
  async move(
    @AuthUser() user: User,
    @Param('gameId', ParseObjectIdPipe) gameId: string,
    @Body() dto: CreateMoveDto,
  ): Promise<Move> {
    return this.gameLogicService.handle(gameId, user._id.toString(), dto);
  }

  @Get()
  @ApiOkResponse({ type: [Move] })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter moves of a specific player',
  })
  async findAll(
    @Param('gameId', ParseObjectIdPipe) gameId: string,
    @Query('userId', ParseObjectIdPipe) userId?: string,
  ): Promise<Move[]> {
    return this.moveService.findAll(gameId, { userId });
  }

  @Get(':moveId')
  @ApiOkResponse({ type: Move })
  @NotFound()
  async findOne(
    @Param('gameId', ParseObjectIdPipe) gameId: string,
    @Param('moveId', ParseObjectIdPipe) id: string,
  ): Promise<Move | null> {
    return this.moveService.findOne(gameId, id);
  }
}
