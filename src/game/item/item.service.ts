import {InjectModel} from "@nestjs/mongoose";
import {FilterQuery, Model} from "mongoose";
import {Item, ItemDocument} from "./item.schema";
import {EventService} from "../../event/event.service";
import {UpdateItemDto} from "./item.dto";
import {ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {Trainer} from "../trainer/trainer.schema";
import {itemTypes} from "../constants";
import {TrainerService} from "../trainer/trainer.service";

@Injectable()
export class ItemService {
  constructor(
    @InjectModel(Item.name) private model: Model<Item>,
    private eventEmitter: EventService,
    private trainerService: TrainerService,
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

  async useItem(trainer: Trainer, dto: UpdateItemDto): Promise<Item | null> {
    if (dto.amount > 1) {
      throw new ForbiddenException('Only one item can be used at a time');
    }
    throw new NotFoundException('Not yet implemented');
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
