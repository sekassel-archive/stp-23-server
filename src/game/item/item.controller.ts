import {Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch} from '@nestjs/common';
import {ApiForbiddenResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {Auth, AuthUser} from '../../auth/auth.decorator';
import {User} from '../../user/user.schema';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {itemTypes} from '../constants';
import {TrainerService} from '../trainer/trainer.service';
import {CreateItemDto} from './item.dto';
import {Item} from './item.schema';
import {ItemService} from './item.service';

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
  @ApiForbiddenResponse({description: 'This item cannot be bought or sold, or you are not the owner of this trainer'})
  @NotFound()
  async updateOne(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('trainerId', ParseObjectIdPipe) trainerId: string,
    @Body() dto: CreateItemDto,
    @AuthUser() user: User,
  ): Promise<Item | null> {
    const itemType = itemTypes.find(type => type.id === dto.type);
    if (!itemType?.price) {
      throw new ForbiddenException('This item cannot be bought or sold');
    }
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
}
