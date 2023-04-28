import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {FilterQuery, Model, UpdateQuery} from 'mongoose';
import {EventService} from '../../event/event.service';
import {MonsterService} from '../monster/monster.service';
import {CreateOpponentDto, UpdateOpponentDto} from './opponent.dto';
import {ChangeMonsterMove, Opponent, OpponentDocument} from './opponent.schema';

@Injectable()
export class OpponentService {
  constructor(
    @InjectModel(Opponent.name) private model: Model<Opponent>,
    private monsterService: MonsterService,
    private eventService: EventService,
  ) {
  }

  async findAll(filter: FilterQuery<Opponent>): Promise<OpponentDocument[]> {
    return this.model.find(filter).exec();
  }

  async findOne(encounter: string, trainer: string): Promise<OpponentDocument | null> {
    return this.model.findOne({encounter, trainer}).exec();
  }

  async create(encounter: string, trainer: string, dto: CreateOpponentDto): Promise<OpponentDocument> {
    try {
      const created = await this.model.create({
        ...dto,
        encounter,
        trainer,
      });
      created && this.emit('created', created);
      return created;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException(`Opponent ${trainer} already exists in encounter ${encounter}`);
      }
      throw err;
    }
  }

  async updateOne(encounter: string, trainer: string, dto: UpdateOpponentDto | UpdateQuery<Opponent>): Promise<OpponentDocument | null> {
    const current = await this.findOne(encounter, trainer);
    if (dto.monster) {
      // Changing the monster happens immediately
      const monster = await this.monsterService.findOne(dto.monster);
      if (!monster) {
        throw new NotFoundException(`Monster ${dto.monster} not found`);
      }
      if (monster.currentAttributes.health <= 0) {
        throw new UnprocessableEntityException(`Monster ${dto.monster} is dead`);
      }
      if (current && current.monster) {
        throw new ConflictException(`Opponent ${trainer} already has a monster`);
      }
    } else if (current && !current.monster) {
      throw new UnprocessableEntityException(`Opponent ${trainer} does not have a monster`);
    }
    if (dto.move && dto.move.type === ChangeMonsterMove.type) {
      // Changing the monster happens immediately
      const monster = await this.monsterService.findOne(dto.move.monster);
      if (!monster) {
        throw new NotFoundException(`Monster ${dto.move.monster} not found`);
      }
      if (monster.currentAttributes.health <= 0) {
        throw new UnprocessableEntityException(`Monster ${dto.move.monster} is dead`);
      }
      dto.monster = dto.move.monster;
    }
    const updated = await this.model.findOneAndUpdate({encounter, trainer}, dto, {new: true}).exec();
    updated && this.emit('updated', updated);
    return updated;
  }

  async deleteOne(encounter: string, trainer: string): Promise<OpponentDocument | null> {
    const deleted = await this.model.findOneAndDelete({encounter, trainer}).exec();
    deleted && this.emit('deleted', deleted);
    return deleted;
  }

  async deleteAll(filter: FilterQuery<OpponentService>) {
    const opponents = await this.findAll(filter);
    await this.model.deleteMany(filter).exec();
    opponents.forEach(o => this.emit('deleted', o));
  }

  async saveMany(opponents: OpponentDocument[]) {
    const newDocs = opponents.filter(o => o.isNew);
    const modDocs = opponents.filter(o => o.isModified());
    await this.model.bulkSave(opponents);
    newDocs.forEach(o => this.emit('created', o));
    modDocs.forEach(o => this.emit('updated', o));
  }

  emit(event: string, opponent: Opponent) {
    this.eventService.emit(`encounters.${opponent.encounter}.opponents.${opponent.trainer}.${event}`, opponent);
  }
}
