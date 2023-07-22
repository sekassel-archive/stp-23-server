import {Controller, Delete, ForbiddenException, Get, Param} from '@nestjs/common';
import {ApiForbiddenResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth, AuthUser} from '../../auth/auth.decorator';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {Monster} from './monster.schema';
import {MonsterService} from './monster.service';
import {Types} from "mongoose";
import {notFound, ObjectIdPipe} from "@mean-stream/nestx";
import {TrainerService} from "../trainer/trainer.service";
import {Opponent} from "../opponent/opponent.schema";
import {User} from "../../user/user.schema";
import {Trainer} from "../trainer/trainer.schema";

@Controller('regions/:region/trainers/:trainer/monsters')
@ApiTags('Trainer Monsters')
@Validated()
@Auth()
@Throttled()
export class MonsterController {
  constructor(
    private readonly monsterService: MonsterService,
    private readonly trainerService: TrainerService,
  ) {
  }

  @Get()
  @ApiOkResponse({type: [Monster]})
  async findAll(
    @Param('region', ParseObjectIdPipe) region: string,
    @Param('trainer', ParseObjectIdPipe) trainer: string,
  ): Promise<Monster[]> {
    return this.monsterService.findAll({trainer});
  }

  @Get(':id')
  @ApiOkResponse({type: Monster})
  @NotFound()
  async findOne(
    @Param('region', ParseObjectIdPipe) region: string,
    @Param('trainer', ParseObjectIdPipe) trainer: string,
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
  ): Promise<Monster | null> {
    return this.monsterService.find(id);
  }

  @Delete(':id')
  @ApiOkResponse({type: Monster})
  @ApiForbiddenResponse({description: 'You can only delete your own monsters.'})
  @NotFound()
  async delete(
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
    @AuthUser() user: User,
  ): Promise<Monster | null> {
    const monster = await this.monsterService.find(id) || notFound(id);
    await this.checkTrainerAccess(monster, user);
    return this.monsterService.delete(id);
  }

  private async checkTrainerAccess(monster: Monster, user: User): Promise<Trainer> {
    const trainer = await this.trainerService.find(new Types.ObjectId(monster.trainer)) || notFound(monster.trainer);
    if (!user._id.equals(trainer.user)) {
      throw new ForbiddenException('You are not the trainer of this monster');
    }
    return trainer;
  }
}
