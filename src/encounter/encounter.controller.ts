import {Controller, Get, Param} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth} from '../auth/auth.decorator';
import {NotFound} from '../util/not-found.decorator';
import {ParseObjectIdPipe} from '../util/parse-object-id.pipe';
import {Throttled} from '../util/throttled.decorator';
import {Validated} from '../util/validated.decorator';
import {Encounter} from './encounter.schema';
import {EncounterService} from './encounter.service';

@Controller('regions/:regionId/encounters')
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
    @Param('regionId', ParseObjectIdPipe) regionId: string,
  ): Promise<Encounter[]> {
    return this.encounterService.findAll(regionId);
  }

  @Get(':userId')
  @ApiOkResponse({type: Encounter})
  @NotFound()
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Encounter | null> {
    return this.encounterService.findOne(id);
  }
}
