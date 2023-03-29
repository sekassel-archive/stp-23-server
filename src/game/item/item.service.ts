import {InjectModel} from "@nestjs/mongoose";
import {FilterQuery, Model} from "mongoose";
import {Item, ItemDocument} from "./item.schema";
import {EventService} from "../../event/event.service";
import {CreateItemDto} from "./item.dto";
import {Injectable} from "@nestjs/common";

@Injectable()
export class ItemService {
  constructor(
    @InjectModel(Item.name) private model: Model<Item>,
    private eventEmitter: EventService,
  ) {
  }

  async create(trainer: string, dto: CreateItemDto): Promise<Item> {
    const created = await this.model.findOneAndUpdate({
      trainer: trainer,
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

  async findOne(id: string): Promise<ItemDocument | null> {
    return this.model.findById(id).exec();
  }
}
