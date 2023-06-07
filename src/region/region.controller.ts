import {Controller, Get, Param} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth} from '../auth/auth.decorator';
import {NotFound} from '../util/not-found.decorator';
import {Throttled} from '../util/throttled.decorator';
import {Validated} from '../util/validated.decorator';
import {Region} from './region.schema';
import {RegionService} from './region.service';
import {Types} from "mongoose";
import {ObjectIdPipe} from "@mean-stream/nestx";

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
  async findOne(@Param('id', ObjectIdPipe) id: Types.ObjectId): Promise<Region | null> {
    return this.regionService.find(id);
  }
}
