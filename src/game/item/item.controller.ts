import {ItemService} from "./item.service";
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch
} from "@nestjs/common";
import {ApiConflictResponse, ApiOkResponse, ApiTags} from "@nestjs/swagger";
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

  // TODO: Check for player near merchant
  @Patch()
  @ApiOkResponse({type: Item})
  @ApiConflictResponse({description: 'Can\'t add item to the trainer\'s inventory'})
  async updateOne(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('trainerId', ParseObjectIdPipe) trainerId: string,
    @Body() dto: CreateItemDto,
    @AuthUser() user: User,
  ): Promise<Item | null> {
    this.validateInput(dto);
    const trainer = await this.trainerService.findOne(trainerId);
    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }
    if (trainer.user.toString() !== user._id.toString()) {
      throw new ForbiddenException('You are not the owner of this trainer');
    }
    return this.itemService.updateOne(trainer, dto);
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
    return this.itemService.findById(id);
  }

  private validateInput(dto: CreateItemDto): void {
    if (dto.amount === 0) {
      throw new BadRequestException('Amount must not be 0');
    }
    const unsupportedTypes = [5, 7];
    if (unsupportedTypes.includes(dto.type)) {
      throw new ForbiddenException('This item cannot be bought or sold');
    }
  }
}
