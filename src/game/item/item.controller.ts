import {ItemService} from "./item.service";
import {Controller, Get, Param} from "@nestjs/common";
import {ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {Validated} from "../../util/validated.decorator";
import {Auth} from "../../auth/auth.decorator";
import {Throttled} from "../../util/throttled.decorator";
import {ParseObjectIdPipe} from "../../util/parse-object-id.pipe";
import {NotFound} from "../../util/not-found.decorator";
import {Item} from "./item.schema";

@Controller('regions/:regionId/trainers/:trainerId/items')
@ApiTags('Trainer Items')
@Validated()
@Auth()
@Throttled()
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
  ) {
  }

  @Get()
  @ApiOkResponse({type: [Item]})
  async findAll(
    @Param('regionId', ParseObjectIdPipe) region: string,
    @Param('trainerId', ParseObjectIdPipe) trainer: string,
  ): Promise<Item[]> {
    return this.itemService.findAll({region, trainer});
  }

  @Get(':id')
  @ApiOkResponse({type: Item})
  @NotFound()
  async findOne(
    @Param('regionId', ParseObjectIdPipe) region: string,
    @Param('trainerId', ParseObjectIdPipe) trainer: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Item | null> {
    return this.itemService.findOne(id);
  }
}
