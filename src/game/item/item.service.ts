import {InjectModel} from "@nestjs/mongoose";
import {FilterQuery, Model} from "mongoose";
import {catchChanceBonus, levelFromExp} from '../formulae';
import {MonsterDocument} from '../monster/monster.schema';
import {Item, ItemDocument} from "./item.schema";
import {EventService} from "../../event/event.service";
import {UpdateItemDto} from "./item.dto";
import {BadRequestException, ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {Trainer} from "../trainer/trainer.schema";
import {baseMonsterTypes, ItemType, itemTypes, monsterTypes, TALL_GRASS_TRAINER, Type} from '../constants';
import {TrainerService} from "../trainer/trainer.service";
import {MonsterService} from "../monster/monster.service";
import {MonsterGeneratorService} from "../logic/monster-generator/monster-generator.service";

@Injectable()
export class ItemService {
  constructor(
    @InjectModel(Item.name) private model: Model<Item>,
    private eventEmitter: EventService,
    private trainerService: TrainerService,
    private monsterService: MonsterService,
    private monsterGenerator: MonsterGeneratorService,
  ) {
  }

  async updateOne(trainer: Trainer, dto: UpdateItemDto): Promise<Item | null> {
    const filteredTrainers = await this.trainerService.findAll({
      area: trainer.area,
      'npc.sells': {$exists: true},
      x: {$gte: trainer.x - 2, $lte: trainer.x + 2},
      y: {$gte: trainer.y - 2, $lte: trainer.y + 2},
    });

    if (filteredTrainers.length === 0) {
      throw new ForbiddenException('Trainer is not near a merchant');
    }

    const itemType = itemTypes.find(item => item.id === dto.type);
    if (!itemType) {
      throw new BadRequestException('Invalid item type');
    }

    const price = itemType.price;
    if (!price) {
      throw new ForbiddenException('This item cannot be traded');
    }

    let moneyChange = 0;
    if (dto.amount > 0) { // buy
      if (!filteredTrainers.some(t => t.npc?.sells?.includes(dto.type))) {
        throw new ForbiddenException('The merchant does not sell this item');
      }
      if (trainer.coins < price * dto.amount) {
        throw new ForbiddenException('Trainer does not have enough coins');
      }
      moneyChange = -price * dto.amount;
    } else { // sell
      const positiveAmount = -dto.amount;
      const item = await this.findOne(trainer._id.toString(), dto.type);
      if (!item || item.amount < positiveAmount) {
        throw new ForbiddenException('Trainer does not have enough items');
      }
      // price may be negative for sell-only items
      moneyChange = Math.abs(price) * positiveAmount / 2;
    }

    await this.trainerService.update(trainer._id, {$inc: {coins: moneyChange}});
    return this.updateAmount(trainer._id.toString(), dto.type, dto.amount);
  }

  async updateAmount(trainer: string, type: number, amount: number): Promise<Item> {
    const result = await this.model.findOneAndUpdate(
      {trainer, type},
      {$inc: {amount}},
      {upsert: true, new: true, setDefaultsOnInsert: true, rawResult: true},
    );
    const item = result.value!;
    this.emit(result.lastErrorObject?.updatedExisting ? 'updated' : 'created', item);
    return item;
  }

  async useItem(trainer: string, type: number, monster: MonsterDocument | null | undefined): Promise<Item | null> {
    const item = await this.findOne(trainer, type);
    if (!item || !item.amount) {
      throw new NotFoundException('Item not found');
    }

    const itemType = itemTypes.find(item => item.id === type);
    if (!itemType) {
      throw new BadRequestException('Invalid item type');
    }

    switch (itemType.use) {
      case 'itemBox':
        if (!(await this.openItemLootbox(itemType, trainer))) {
          return item;
        }
        break;
      case 'monsterBox':
        await this.openMonsterLootbox(itemType, trainer);
        break;
      case 'ball':
        if (!monster) {
          throw new NotFoundException('Monster not found');
        }
        if (monster.trainer !== TALL_GRASS_TRAINER) {
          throw new ForbiddenException('Monster is not wild');
        }
        if (this.useBall(trainer, itemType, monster)) {
          // balls may have effects
          itemType.effects && await this.monsterService.applyEffects(monster, itemType.effects);
        }
        break;
      case 'effect':
        if (!monster) {
          throw new NotFoundException('Monster not found');
        }
        if (monster.trainer !== trainer) {
          throw new ForbiddenException('You are not the owner of this monster');
        }
        itemType.effects && await this.monsterService.applyEffects(monster, itemType.effects);
        break;
    }

    return this.updateAmount(trainer, type, -1);
  }

  async openItemLootbox(itemType: ItemType, trainer: string) {
    const minValue = itemType.price;
    const maxValue = Math.floor(itemType.price * 2);

    const candidates = itemTypes.filter(item => item.price >= minValue && item.price <= maxValue && item.use !== 'itemBox' && item.use !== 'monsterBox');
    const item = candidates.random();
    if (item) {
      // Add the closest item to trainer's inventory
      await this.updateAmount(trainer, item.id, 1);
      return true;
    } else {
      return false;
    }
  }


  private async openMonsterLootbox(itemType: ItemType, trainer: string) {
    const randomBaseMonster = baseMonsterTypes.random();
    // 250 -> level 6-10, 1000 -> level 10-14, 8000 -> level 20-24
    const level = Math.round(levelFromExp(itemType.price) + Math.random() * 4);
    await this.monsterGenerator.createAuto(trainer, randomBaseMonster.id, level);
  }

  private useBall(trainer: string, itemType: ItemType, monster: MonsterDocument): boolean {
    const monsterType = monsterTypes.find(o => o.id === monster.type);
    // take either the default catch chance ('*') or the best catch chance for the monster's types
    const chance = Math.max(itemType.catch?.['*'] || 0, ...monsterType?.type.map(type => itemType.catch?.[type as Type] || 0) || []);
    const chanceBonus = catchChanceBonus(monster);
    if (chance && Math.random() < chance + chanceBonus) {
      monster.trainer = trainer;
      return true;
    }
    return false;
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
