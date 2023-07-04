import {Controller, DefaultValuePipe, Get, Param, ParseBoolPipe, Query} from '@nestjs/common';
import {ApiOkResponse, ApiParam, ApiTags} from '@nestjs/swagger';
import {Auth} from '../../auth/auth.decorator';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {Area} from './area.schema';
import {AreaService} from './area.service';
import {ObjectIdPipe} from "@mean-stream/nestx";
import {Types} from "mongoose";

@Controller('regions/:region/areas')
@ApiTags('Region Areas')
@Validated()
@Auth()
@Throttled()
export class AreaController {
  constructor(
    private readonly areaService: AreaService,
  ) {
  }

  @Get()
  @ApiOkResponse({type: [Area]})
  @ApiParam({
    name: 'spawn',
    required: false,
    schema: {default: false, type: 'boolean'},
    description: 'Only return areas with spawn points'
  })
  async findAll(
    @Param('region', ParseObjectIdPipe) region: string,
    @Query('spawn', new DefaultValuePipe(false), ParseBoolPipe) spawn: boolean,
  ): Promise<Area[]> {
    return this.areaService.findAll(spawn ? {region, spawn: {$exists: true}} : {region}, {
      projection: {
        'map.layers.objects': 0,
        'map.layers.chunks': 0,
        'map.layers.data': 0,
      },
      sort: '+name',
    });
  }

  @Get(':id')
  @ApiOkResponse({type: Area})
  @NotFound()
  async findOne(
    @Param('region', ParseObjectIdPipe) region: string,
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
  ): Promise<Area | null> {
    return this.areaService.find(id, {projection: {'map.layers.objects': 0}});
  }
}
