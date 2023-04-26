import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch
} from '@nestjs/common';
import {ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags} from '@nestjs/swagger';
import {Auth, AuthUser} from '../../auth/auth.decorator';
import {User} from '../../user/user.schema';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {itemTypes} from '../constants';
import {TrainerService} from '../trainer/trainer.service';
import {UpdateItemDto} from './item.dto';
import {Item} from './item.schema';
import {ItemService} from './item.service';
import {ItemAction} from "./item.action";

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

  @Patch()
  @ApiOperation({description: 'Trade and use items'})
  @ApiOkResponse({type: Item})
  @ApiForbiddenResponse({description: 'This item cannot be bought, sold or used, or you are not the owner of this trainer'})
  @NotFound()
  async updateOne(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('trainerId', ParseObjectIdPipe) trainerId: string,
    @Body() dto: UpdateItemDto,
    @AuthUser() user: User,
  ): Promise<Item | null> {
    const {type, amount, action} = dto;
    const itemType = itemTypes.find(itemType => itemType.id === type);
    if (!itemType?.price) {
      throw new ForbiddenException('This item cannot be bought, sold or used');
    }

    // Remove when lootbox-implementation is finished
    if (action === ItemAction.USE && itemType?.effects.length === 0) {
      throw new NotFoundException('Feature not implemented at the moment');
    }

    const trainer = await this.trainerService.findOne(trainerId);
    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }
    if (trainer.user.toString() !== user._id.toString()) {
      throw new ForbiddenException('You are not the owner of this trainer');
    }
    if (action === ItemAction.USE && amount !== 1) {
      throw new BadRequestException('Amount must be exactly 1 when using items');
    }
    if (action === ItemAction.USE) {
      return this.itemService.useItem(trainer, dto);
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
}
