import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseArrayPipe,
  ParseEnumPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import {Auth, AuthUser} from '../../auth/auth.decorator';
import {User} from '../../user/user.schema';
import {NotFound} from '../../util/not-found.decorator';
import {ParseObjectIdPipe} from '../../util/parse-object-id.pipe';
import {Throttled} from '../../util/throttled.decorator';
import {Validated} from '../../util/validated.decorator';
import {itemTypes} from '../constants';
import {MonsterService} from '../monster/monster.service';
import {TrainerService} from '../trainer/trainer.service';
import {UpdateItemDto} from './item.dto';
import {Item} from './item.schema';
import {ItemService} from './item.service';
import {ItemAction} from "./item.action";
import {Types} from "mongoose";
import {exceptionDesc} from "../../util/exception.extractor";
import {OpponentService} from "../opponent/opponent.service";

@Controller('regions/:regionId/trainers/:trainerId/items')
@ApiTags('Trainer Items')
@Validated()
@Auth()
@Throttled()
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
    private readonly trainerService: TrainerService,
    private readonly monsterService: MonsterService,
    private readonly opponentService: OpponentService,
  ) {
  }

  @Post()
  @ApiOperation({summary: 'Trade and use items'})
  @ApiQuery({name: 'action', enum: ItemAction, description: 'The action to perform. Default: trade', required: false})
  @ApiCreatedResponse({type: Item})
  @ApiForbiddenResponse({description: exceptionDesc(ForbiddenException, ItemController.prototype.updateOne, ItemService.prototype.updateOne)})
  @NotFound()
  async updateOne(
    @Param('trainerId', ParseObjectIdPipe) trainerId: string,
    @Query('action', new DefaultValuePipe(ItemAction.TRADE), new ParseEnumPipe(ItemAction)) action: ItemAction,
    @Body() dto: UpdateItemDto,
    @AuthUser() user: User,
  ): Promise<Item | null> {
    const {type, amount} = dto;
    const itemType = itemTypes.find(itemType => itemType.id === type);
    if (!itemType?.price) {
      throw new ForbiddenException('This item cannot be bought, sold or used');
    }
    const trainer = await this.trainerService.find(new Types.ObjectId(trainerId));
    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }
    if (trainer.user.toString() !== user._id.toString()) {
      throw new ForbiddenException('You are not the owner of this trainer');
    }
    if (action === ItemAction.USE) {
      if (amount !== 1) {
        throw new BadRequestException('Amount must be exactly 1 when using items');
      }
      if (await this.opponentService.findOne({trainer: trainer._id.toString()})) {
        throw new ForbiddenException('You cannot use items while in a battle');
      }
      const monster = dto.monster ? await this.monsterService.find(new Types.ObjectId(dto.monster)) : null;
      const result = await this.itemService.useItem(trainer._id.toString(), dto.type, monster);
      monster && await this.monsterService.saveAll([monster]);
      return result;
    }
    return this.itemService.updateOne(trainer, dto);
  }

  @Get()
  @ApiQuery({name: 'types', description: 'Filter by numeric Item IDs (comma-separated)', required: false, type: String})
  @ApiOkResponse({type: Item})
  async findAll(
    @Param('trainerId', ParseObjectIdPipe) trainer: string,
    @Query('types', new ParseArrayPipe({items: Number, optional: true})) types?: number[],
  ): Promise<Item[]> {
    return this.itemService.findAll({
      trainer,
      type: types && types.length ? {$in: types} : undefined,
    });
  }

  @Get(':id')
  @ApiOkResponse({type: Item})
  @NotFound()
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Item | null> {
    return this.itemService.findById(id);
  }
}
