import {Controller, Get, Param} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth} from '../../auth/auth.decorator';
import {NotFound} from '../../util/not-found.decorator';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {Encounter} from './encounter.schema';
import {EncounterService} from './encounter.service';
import {Types} from "mongoose";
import {ObjectIdPipe} from '@mean-stream/nestx';

@Controller('regions/:region/encounters')
@ApiTags('Region Encounters')
@Validated()
@Auth()
@Throttled()
export class EncounterController {
  constructor(
    private readonly encounterService: EncounterService,
  ) {
  }

  @Get()
  @ApiOkResponse({type: [Encounter]})
  async findAll(
    @Param('region', ObjectIdPipe) region: Types.ObjectId,
  ): Promise<Encounter[]> {
    return this.encounterService.findAll(region);
  }

  @Get(':id')
  @ApiOkResponse({type: Encounter})
  @NotFound()
  async findOne(
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
  ): Promise<Encounter | null> {
    return this.encounterService.findOne(id);
  }
}
