import {InjectModel} from "@nestjs/mongoose";
import {FilterQuery, Model} from "mongoose";
import {catchChanceBonus} from '../formulae';
import {Item, ItemDocument} from "./item.schema";
import {EventService} from "../../event/event.service";
import {UpdateItemDto} from "./item.dto";
import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {Trainer} from "../trainer/trainer.schema";
import {itemTypes, monsterTypes, TALL_GRASS_TRAINER, Type} from '../constants';
import {TrainerService} from "../trainer/trainer.service";
import {MonsterService} from "../monster/monster.service";

@Injectable()
export class ItemService {
  constructor(
    @InjectModel(Item.name) private model: Model<Item>,
    private eventEmitter: EventService,
    private trainerService: TrainerService,
    private monsterService: MonsterService,
  ) {
  }

  async updateOne(trainer: Trainer, dto: UpdateItemDto): Promise<Item | null> {
    const filteredTrainers = await this.trainerService.findAll({
      area: trainer.area,
      'npc.isMerchant': true,
      x: {$gte: trainer.x - 2, $lte: trainer.x + 2},
      y: {$gte: trainer.y - 2, $lte: trainer.y + 2},
    });

    if (filteredTrainers.length === 0) {
      throw new ForbiddenException('Trainer is not near a merchant');
    }

    const itemType = itemTypes.find(item => item.id === dto.type);
    const price = itemType?.price;
    const hasEnoughCoinsToBuy = price != null && dto.amount > 0 && trainer.coins >= price * dto.amount;
    const item = await this.findOne(trainer._id.toString(), dto.type);
    const hasEnoughItemsToSell = price != null && dto.amount < 0 && item?.amount != null && item.amount >= dto.amount;
    let moneyChange = 0;

    if (hasEnoughCoinsToBuy) {
      moneyChange = -price * dto.amount;
    } else if (hasEnoughItemsToSell) {
      moneyChange = -price * dto.amount / 2;
    } else {
      throw new ForbiddenException('Trainer does not have enough items or coins');
    }

    await this.trainerService.update(trainer._id.toString(), {$inc: {coins: moneyChange}});
    const created = await this.model.findOneAndUpdate(
      {trainer: trainer._id, type: dto.type},
      {$inc: {amount: dto.amount}},
      {upsert: true, new: true, setDefaultsOnInsert: true}
    );
    this.emit('created', created);
    return created;
  }

  async useItem(trainer: string, type: number, target: string): Promise<Item | null> {
    const item = await this.findOne(trainer, type);
    if (!item || !item.amount) {
      throw new NotFoundException('Item not found');
    }

    const itemType = itemTypes.find(item => item.id === type);
    if (!itemType) {
      throw new BadRequestException('Invalid item type');
    }
    const monster = await this.monsterService.findOne(target);
    if (!monster) {
      throw new NotFoundException(`Monster ${target} not found`);
    }

    if (itemType.catch) {
      if (monster.trainer !== TALL_GRASS_TRAINER) {
        throw new ForbiddenException('Monster is not wild');
      }
      const monsterType = monsterTypes.find(o => o.id === monster.type);
      // take either the default catch chance ('*') or the best catch chance for the monster's types
      const chance = Math.max(itemType.catch['*'] || 0, ...monsterType?.type.map(type => itemType.catch?.[type as Type] || 0) || []);
      const chanceBonus = catchChanceBonus(monster);
      if (chance && Math.random() < chance + chanceBonus) {
        monster.trainer = trainer;
      }
    }

    await this.monsterService.applyEffects(monster, itemType.effects);
    return this.model.findOneAndUpdate({trainer, type}, {$inc: {amount: -1}});
  }

  async getStarterItems(trainer: Trainer, dto: UpdateItemDto): Promise<Item | null> {
    const created = await this.model.findOneAndUpdate(
      {trainer: trainer._id, type: dto.type},
      {$inc: {amount: dto.amount}},
      {upsert: true, new: true, setDefaultsOnInsert: true}
    );
    this.emit('created', created);
    return created;
  }

  async deleteTrainer(trainer: string): Promise<Item[]> {
    const items = await this.model.find({trainer}).exec();
    for (const item of items) {
      this.emit('deleted', item);
    }
    await this.model.deleteMany({trainer}).exec();
    return items;
  }

  private emit(event: string, item: Item): void {
    this.eventEmitter.emit(`trainers.${item.trainer}.items.${item._id}.${event}`, item);
  }

  async findAll(filter: FilterQuery<Item>): Promise<ItemDocument[]> {
    return this.model.find(filter).exec();
  }

  async findOne(trainer: string, type: number): Promise<ItemDocument | null> {
    return this.model.findOne({trainer: trainer, type: type});
  }

  async findById(id: string): Promise<ItemDocument | null> {
    return this.model.findById(id).exec();
  }
}
