import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model, Types} from 'mongoose';
import {EventService} from '../../event/event.service';
import {abilities, Ability, monsterTypes, Type, types} from '../constants';
import {MonsterAttributes, MonsterDocument} from '../monster/monster.schema';
import {MonsterService} from '../monster/monster.service';
import {OpponentService} from '../opponent/opponent.service';
import {CreateEncounterDto} from './encounter.dto';
import {Encounter, EncounterDocument} from './encounter.schema';

@Injectable()
export class EncounterService {
  constructor(
    private monsterService: MonsterService,
    private opponentService: OpponentService,
    private eventService: EventService,
    @InjectModel(Encounter.name) private model: Model<Encounter>,
  ) {
  }

  async findAll(region: string): Promise<EncounterDocument[]> {
    return this.model.find({region}).exec();
  }

  async findOne(id: string): Promise<EncounterDocument | null> {
    return this.model.findById(id).exec();
  }

  async create(region: string, dto: CreateEncounterDto): Promise<EncounterDocument> {
    const encounter = await this.model.create({
      ...dto,
      region,
    });
    encounter && this.emit('create', encounter);
    return encounter;
  }

  private emit(event: string, encounter: Encounter) {
    this.eventService.emit(`regions.${encounter.region}.encounters.${encounter._id.toString()}.${event}`, encounter);
  }

  async playRound(encounter: Encounter): Promise<void> {
    const opponents = await this.opponentService.findAll({region: encounter.region, encounter: encounter._id.toString()});
    if (opponents.find(o => !o.move)) {
      return;
    }

    const monsters = await this.monsterService.findAll({_id: {$in: opponents.map(o => new Types.ObjectId(o.monster))}});

    monsters.sort((a, b) => a.attributes.initiative - b.attributes.initiative);

    for (const monster of monsters) {
      const opponent = opponents.find(o => o.monster === monster._id.toString());
      const move = opponent?.move;
      if (move && move.type === 'ability') {
        if (!monster.abilities.includes(move.ability)) {
          // TODO log error
          continue;
        }
        const ability = abilities.find(a => a.id === move.ability);
        if (!ability) {
          // TODO log error
          continue;
        }

        // FIXME target may be new monster if one was defeated
        const target = monsters.find(m => m._id.toString() === move.target);
        if (!target) {
          // TODO log error
          continue;
        }

        this.playAbility(ability, monster, target);
      }
    }
  }

  private playAbility(ability: Ability, currentMonster: MonsterDocument, targetMonster: MonsterDocument) {
    for (const value of ability.effects) {
      if (value.chance == null || Math.random() <= value.chance) {
        const effectTarget = (value.self === true || (value.self == null && value.amount > 0)) ? currentMonster : targetMonster;
        const attribute = value.attribute as keyof MonsterAttributes;
        let effectAmount: number = value.amount;

        if (attribute === 'health') {
          if (effectTarget.attributes.defense > value.amount + currentMonster.attributes.attack) {
            effectAmount = 0;
          } else {
            effectAmount += currentMonster.attributes.attack - effectTarget.attributes.defense;
          }

          const targetTypes = (monsterTypes.find(m => m.id === targetMonster.type)?.type || []) as Type[];
          for (const targetType of targetTypes) {
            const abilityType = ability.type as Type;
            const type = types[abilityType];
            effectAmount *= (type?.multipliers as Partial<Record<Type, number>>)?.[targetType] || 1;
          }
        }

        effectTarget.attributes[attribute] += effectAmount;
        if (effectTarget.attributes[attribute] <= 0) {
          effectTarget.attributes[attribute] = 0;
          if (attribute === 'health' && effectTarget !== currentMonster) {
            this.gainExp(currentMonster, effectTarget);
          }
        }
      }
    }
  }

  private gainExp(currentMonster: MonsterDocument, effectTarget: MonsterDocument) {
    // TODO improve experience gain
    currentMonster.experience += (effectTarget.level * 10 * (0.9 + Math.random() * 0.2)) | 0;

    while (true) {
      const levelUp = currentMonster.level ** 3 - (currentMonster.level - 1) ** 3;
      if (currentMonster.experience >= levelUp) {
        currentMonster.level++;
        currentMonster.experience -= levelUp;
      } else {
        break;
      }
    }
  }
}