import {ItemService} from "./item.service";
import {Body, Controller, ForbiddenException, Get, Param, Patch, Post} from "@nestjs/common";
import {ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiTags} from "@nestjs/swagger";
import {Validated} from "../../util/validated.decorator";
import {Auth, AuthUser} from "../../auth/auth.decorator";
import {Throttled} from "../../util/throttled.decorator";
import {ParseObjectIdPipe} from "../../util/parse-object-id.pipe";
import {NotFound} from "../../util/not-found.decorator";
import {Item} from "./item.schema";
import {CreateItemDto} from "./item.dto";
import {User} from "../../user/user.schema";
import {TrainerService} from "../trainer/trainer.service";

@Controller('regions/:regionId/trainers/:trainerId/items')
@ApiTags('Trainer Items')
@Validated()
@Auth()
@Throttled()
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
    private readonly trainerService: TrainerService,
  ) {
  }

  @Post()
  @ApiCreatedResponse({type: Item})
  @ApiConflictResponse({description: 'Can\'t add item to the trainer\'s inventory'})
  async create(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('trainerId', ParseObjectIdPipe) trainerId: string,
    @Body() dto: CreateItemDto,
    @AuthUser() user: User,
  ): Promise<Item> {
    if (dto.amount <= 0) {
      throw new ForbiddenException('Amount must be greater than 0');
    }
    const trainer = await this.trainerService.findOne(trainerId);
    if (!(trainer?.user.toString() === user._id.toString())) {
      throw new ForbiddenException('You are not the owner of this trainer');
    }
    return this.itemService.create(trainerId, dto);
  }

  // TODO: Patch endpoint for selling or adding (check for player near merchant?)
  @Patch()
  @ApiOkResponse({type: Item})
  async updateOne(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('trainerId', ParseObjectIdPipe) trainerId: string,
    @Body() dto: CreateItemDto,
    @AuthUser() user: User,
  ): Promise<Item | null> {
    if (dto.amount === 0) {
      return null;
    }
    const trainer = await this.trainerService.findOne(trainerId);
    if (!trainer) {
      return null;
    }
    if (!(trainer?.user.toString() === user._id.toString())) {
      throw new ForbiddenException('You are not the owner of this trainer');
    }
    // TODO: Check if trainer has enough items to be subtracted / enough coins to buy
    return this.itemService.updateOne(trainerId, dto);
  }

  @Get()
  @ApiOkResponse({type: Item})
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
