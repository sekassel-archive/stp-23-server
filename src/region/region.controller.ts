import {Controller, Get, Param} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth} from '../auth/auth.decorator';
import {NotFound} from '@clashsoft/nestx';
import {ParseObjectIdPipe} from '../util/parse-object-id.pipe';
import {Throttled} from '../util/throttled.decorator';
import {Validated} from '../util/validated.decorator';
import {Region} from './region.schema';
import {RegionService} from './region.service';

@Controller('regions')
@ApiTags('Regions')
@Validated()
@Auth()
@Throttled()
export class RegionController {
  constructor(
    private readonly regionService: RegionService,
  ) {
  }

  @Get()
  @ApiOkResponse({type: [Region]})
  async findAll(): Promise<Region[]> {
    return this.regionService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({type: Region})
  @NotFound()
  async findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Region | null> {
    return this.regionService.findOne(id);
  }
}
