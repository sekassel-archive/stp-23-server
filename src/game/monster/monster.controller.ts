import {Controller, Get, Param} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth} from '../../auth/auth.decorator';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {Monster} from './monster.schema';
import {MonsterService} from './monster.service';
import {Types} from "mongoose";
import {ObjectIdPipe} from "@mean-stream/nestx";

@Controller('regions/:region/trainers/:trainer/monsters')
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
    return this.monsterService.findOne(id);
  }
}
