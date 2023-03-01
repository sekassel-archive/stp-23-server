import {Controller, Get, Param} from '@nestjs/common';
import {ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth} from '../../auth/auth.decorator';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {Area} from './area.schema';
import {AreaService} from './area.service';

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
  async findAll(
    @Param('region', ParseObjectIdPipe) region: string,
  ): Promise<Area[]> {
    return this.areaService.findAll({region});
  }

  @Get(':id')
  @ApiOkResponse({type: Area})
  @NotFound()
  async findOne(
    @Param('region', ParseObjectIdPipe) region: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Area | null> {
    return this.areaService.findOne(id);
  }
}
