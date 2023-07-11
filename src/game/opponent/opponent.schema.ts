import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiExtraModels, ApiProperty, ApiPropertyOptional, refs} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {Equals, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsMongoId, IsOptional, ValidateNested} from 'class-validator';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT} from '../../util/schema';
import {abilities, itemTypes, MonsterStatus} from '../constants';
import {Doc} from "@mean-stream/nestx";

@Schema()
export class AbilityMove {
  static type = 'ability' as const;

  @ApiProperty({enum: [AbilityMove.type]})
  @Equals(AbilityMove.type)
  type: typeof AbilityMove.type;

  @ApiProperty()
  @IsInt()
  @IsIn(abilities.map(a => a.id))
  ability: number;

  @ApiProperty({...MONGO_ID_FORMAT, description: 'Opponent ID'})
  @IsMongoId()
  target: string;
}

@Schema()
export class ChangeMonsterMove {
  static type = 'change-monster' as const;

  @ApiProperty({enum: [ChangeMonsterMove.type]})
  @Equals(ChangeMonsterMove.type)
  type: typeof ChangeMonsterMove.type;

  @ApiProperty({...MONGO_ID_FORMAT, description: 'Monster ID'})
  @IsMongoId()
  monster: string;
}

@Schema()
export class UseItemMove {
  static type = 'use-item' as const;

  @ApiProperty({enum: [UseItemMove.type]})
  @Equals(UseItemMove.type)
  type: typeof UseItemMove.type;

  @ApiProperty({description: 'Item type ID'})
  @IsInt()
  @IsIn(itemTypes.map(i => i.id))
  item: number;

  @ApiProperty({...MONGO_ID_FORMAT, description: 'Monster ID'})
  @IsMongoId()
  target: string;
}

export type Move = AbilityMove | ChangeMonsterMove | UseItemMove;

export const RESULTS_WITH_DESCRIPTION = {
  'ability-success': 'The ability was successful',
  'ability-failed': 'The ability failed due to the status',
  'item-success': 'The item was used successfully',
  'status-added': 'The status was added',
  'status-removed': 'The status was removed',
  'status-damage': 'The status dealt damage',
  'target-defeated': 'The target monster was defeated',
  'monster-changed': 'The monster was changed successfully',
  'monster-defeated': 'The monster was defeated',
  'monster-levelup': 'The monster leveled up',
  'monster-evolved': 'The monster evolved',
  'monster-learned': 'The monster learned a new ability',
  // Error cases
  'monster-dead': 'The monster is dead before it made a move',
  'ability-unknown': 'The monster doesn\'t have the ability, or the ability ID does not exist',
  'ability-no-uses': 'The monster doesn\'t have any uses left for the ability',
  'item-failed': 'The item use failed',
  'target-unknown': 'The target opponent does not exist or has fled',
  'target-dead': 'The target monster is already dead',
} as const;

export const RESULTS = Object.keys(RESULTS_WITH_DESCRIPTION);

export const EFFECTIVENESS = ['super-effective', 'effective', 'normal', 'ineffective', 'no-effect'] as const;
export type Effectiveness = typeof EFFECTIVENESS[number];

export class Result {
  @ApiProperty({
    enum: RESULTS,
    description: Object.entries(RESULTS_WITH_DESCRIPTION).map(([key, value]) => `- ${key}: ${value}`).join('\n'),
  })
  @IsIn(RESULTS)
  type: keyof typeof RESULTS_WITH_DESCRIPTION;

  @ApiPropertyOptional({description: 'For `ability-*` and `monster-learned`.'})
  @IsOptional()
  @IsInt()
  @IsIn(abilities.map(a => a.id))
  ability?: number;

  @ApiPropertyOptional({description: 'For `ability-success` and `status-damage`.', enum: EFFECTIVENESS})
  @IsOptional()
  @IsIn(EFFECTIVENESS)
  effectiveness?: Effectiveness;

  @ApiPropertyOptional({description: 'For `item-*`.'})
  @IsOptional()
  @IsInt()
  @IsIn(itemTypes.map(i => i.id))
  item?: number;

  @ApiPropertyOptional({description: 'For `status-*`.'})
  @IsOptional()
  @IsEnum(MonsterStatus)
  status?: MonsterStatus;
}

@Schema(GLOBAL_SCHEMA_OPTIONS)
@ApiExtraModels(AbilityMove, ChangeMonsterMove, UseItemMove)
export class Opponent extends GlobalSchema {
  @Prop({index: 1})
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  encounter: string;

  @Prop({index: 1})
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  trainer: string;

  @Prop()
  @ApiProperty({description: 'Whether the opponent started the encounter. ' +
      'Allows grouping opponents into two teams.'})
  @IsBoolean()
  isAttacker: boolean;

  @Prop()
  @ApiProperty({description: 'Whether the opponent is an NPC. Handled by the server.'})
  @IsBoolean()
  isNPC: boolean;

  @Prop()
  @ApiPropertyOptional({
    ...MONGO_ID_FORMAT, description: 'Can be patched when set to undefined/null. ' +
      'This happens after the monster died. ' +
      'You then have to patch a new monster ID to change the monster without expending your move.',
  })
  @IsOptional()
  @IsMongoId()
  monster?: string;

  @Prop({type: Object})
  @ApiProperty({
    oneOf: refs(AbilityMove, ChangeMonsterMove, UseItemMove),
    description: 'Patch this value to make your move. ' +
      'Once all players have made a move, the server will make a move for all NPCs. ' +
      'After that, the server will play the round and reset all moves to undefined. ' +
      'You can then make a move again.',
  })
  @ValidateNested()
  @Type(() => Object, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'type',
      subTypes: [
        {value: AbilityMove, name: AbilityMove.type},
        {value: ChangeMonsterMove, name: ChangeMonsterMove.type},
        {value: UseItemMove, name: UseItemMove.type},
      ],
    },
  })
  move?: Move;

  @Prop({default: true})
  @ApiProperty({type: [Result], description: 'The results of the last round.'})
  @IsArray()
  @IsIn(RESULTS, {each: true})
  results: Result[];

  @Prop({default: 0})
  @ApiProperty({description: 'The number of coins that will be earned when the encounter is won.'})
  @IsInt()
  coins: number;
}

export type OpponentDocument = Doc<Opponent>;

export const OpponentSchema = SchemaFactory.createForClass(Opponent);
