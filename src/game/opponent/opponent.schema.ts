import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiExtraModels, ApiProperty, ApiPropertyOptional, refs} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {Equals, IsArray, IsBoolean, IsIn, IsInt, IsMongoId, IsOptional, ValidateNested} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_WITHOUT_ID_OPTIONS, GlobalSchemaWithoutID, MONGO_ID_FORMAT} from '../../util/schema';
import {abilities, itemTypes, Result, RESULTS, RESULTS_WITH_DESCRIPTION} from '../constants';

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

@Schema(GLOBAL_SCHEMA_WITHOUT_ID_OPTIONS)
@ApiExtraModels(AbilityMove, ChangeMonsterMove)
export class Opponent extends GlobalSchemaWithoutID {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  encounter: string;

  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  trainer: string;

  @Prop()
  @ApiProperty()
  @IsBoolean()
  isAttacker: boolean;

  @Prop()
  @ApiProperty()
  @IsBoolean()
  isNPC: boolean;

  @Prop()
  @ApiPropertyOptional({...MONGO_ID_FORMAT, description: 'Can be patched when set to undefined/null. ' +
      'This happens after the monster died. ' +
      'You can then patch a new monster ID to change the monster without expending your move.'})
  @IsOptional()
  @IsMongoId()
  monster?: string;

  @Prop({type: Object})
  @ApiProperty({
    oneOf: refs(AbilityMove, ChangeMonsterMove),
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

  @Prop()
  @ApiProperty({
    enum: RESULTS,
    isArray: true,
    description: 'The results of the last round.\n\n' +
      Object.entries(RESULTS_WITH_DESCRIPTION).map(([key, value]) => `- ${key}: ${value}`).join('\n'),
  })
  @IsArray()
  @IsIn(RESULTS, {each: true})
  results: Result[];
}

export type OpponentDocument = Opponent & Document<Types.ObjectId, any, Opponent>;

export const OpponentSchema = SchemaFactory.createForClass(Opponent)
  .index({encounter: 1, trainer: 1}, {unique: true})
;
