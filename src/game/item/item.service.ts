import {InjectModel} from "@nestjs/mongoose";
import {FilterQuery, Model} from "mongoose";
import {Item, ItemDocument} from "./item.schema";
import {EventService} from "../../event/event.service";
import {CreateItemDto} from "./item.dto";
import {ForbiddenException, Injectable} from "@nestjs/common";
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

  async updateOne(trainer: Trainer, dto: CreateItemDto): Promise<Item | null> {
    // TODO: Check if trainer has enough items to be subtracted / enough coins to buy
    const price = itemTypes.find(item => item.id === dto.type)?.price;
    let money = 0;

    // Trainer has enough coins to buy the amount of items
    if (price && dto.amount > 0 && trainer.coins >= price * dto.amount) {
      money = -price * dto.amount;
    }

    // Trainer has enough items to sell
    const item = await this.findOne(trainer._id.toString(), dto.type.toString());
    if (price && item && dto.amount < 0 && item.amount >= dto.amount) {
      money = -price * dto.amount / 2;
    }

    const response = await this.trainerService.update(trainer._id.toString(), {$inc: {coins: money}});
    if (!response) {
      throw new ForbiddenException('Trainer does not have enough items or coins');
    }

    const created = await this.model.findOneAndUpdate({
      trainer: trainer._id,
      type: dto.type
    }, {$inc: {amount: dto.amount}}, {upsert: true, new: true, setDefaultsOnInsert: true});
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

  async findOne(trainer: string, type: string): Promise<ItemDocument | null> {
    return this.model.findOne({type: type});
  }
}
