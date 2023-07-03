import {Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query} from '@nestjs/common';
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
import {CreateTrainerDto, MoveTrainerDto, TalkTrainerDto, UpdateTrainerDto} from './trainer.dto';
import {Direction, Trainer} from './trainer.schema';
import {TrainerService} from './trainer.service';
import {notFound, ObjectIdPipe} from "@mean-stream/nestx";
import {Types} from "mongoose";
import {AreaService} from "../area/area.service";
import {SocketService} from "../../udp/socket.service";

@Controller('regions/:region/trainers')
@ApiTags('Region Trainers')
@ApiExtraModels(MoveTrainerDto, TalkTrainerDto)
@Validated()
@Auth()
@Throttled()
export class TrainerController {
  constructor(
    private readonly trainerService: TrainerService,
    private readonly areaService: AreaService,
    private readonly socketService: SocketService,
  ) {
  }

  @Post()
  @ApiCreatedResponse({type: Trainer})
  @ApiConflictResponse({description: 'Trainer for current user already exists'})
  async create(
    @Param('region', ObjectIdPipe) region: Types.ObjectId,
    @Body() dto: CreateTrainerDto,
    @AuthUser() user: User,
  ): Promise<Trainer> {
    return this.trainerService.createSimple(region, user._id.toString(), dto);
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
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
  ): Promise<Trainer | null> {
    return this.trainerService.find(id);
  }

  @Patch(':id')
  @ApiOkResponse({type: Trainer})
  @ApiForbiddenResponse({description: 'Cannot update someone else\'s trainer'})
  @NotFound()
  async updateOne(
    @Param('region', ParseObjectIdPipe) region: string,
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateTrainerDto,
    @AuthUser() user: User,
  ): Promise<Trainer | null> {
    await this.checkTrainerAuth(user, 'update', id);
    if (dto.area) {
      const oldTrainer = await this.trainerService.find(id) || notFound(id);
      if (!oldTrainer.visitedAreas.includes(dto.area)) {
        throw new ForbiddenException(`Cannot move trainer to unvisited area ${dto.area}`);
      }

      const area = await this.areaService.find(new Types.ObjectId(dto.area)) || notFound(dto.area);
      if (!area.spawn) {
        throw new ForbiddenException(`Cannot move trainer ${area.name}`);
      }

      if (area.region !== region) {
        throw new ForbiddenException(`Cannot move trainer to area in a different region`);
      }

      const {x, y} = area.spawn;
      const move: MoveTrainerDto = {_id: id, area: dto.area, x, y, direction: Direction.DOWN};
      const result = await this.trainerService.update(id, {...dto, ...move});
      this.socketService.broadcast(`areas.${oldTrainer.area}.trainers.${id}.moved`, move);
      this.socketService.broadcast(`areas.${dto.area}.trainers.${id}.moved`, move);
      return result;
    }
    return this.trainerService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({type: Trainer})
  @ApiForbiddenResponse({description: 'Cannot delete someone else\'s trainer'})
  @NotFound()
  async deleteOne(
    @Param('region', ParseObjectIdPipe) region: string,
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
    @AuthUser() user: User,
  ): Promise<Trainer | null> {
    await this.checkTrainerAuth(user, 'delete', id);
    return this.trainerService.delete(id);
  }

  private async checkTrainerAuth(user: User, op: string, id: Types.ObjectId) {
    const trainer = await this.trainerService.find(id);
    if (trainer?.user !== user._id.toString()) {
      throw new ForbiddenException(`Cannot ${op} someone else's trainer`);
    }
  }
}
