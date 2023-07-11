import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsArray, IsEnum, IsInt, IsMongoId, IsObject, ValidateNested} from 'class-validator';
import {Document, SchemaTypes, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT} from '../../util/schema';
import {expRequired} from '../formulae';
import {MAX_ABILITIES, MonsterStatus} from '../constants';

export class MonsterAttributes {
  @ApiProperty()
  @IsInt()
  health: number;

  @ApiProperty()
  @IsInt()
  attack: number;

  @ApiProperty()
  @IsInt()
  defense: number;

  @ApiProperty()
  @IsInt()
  speed: number;
}

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Monster extends GlobalSchema {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  trainer: string;

  @Prop()
  @ApiProperty()
  @IsInt()
  type: number;

  @Prop()
  @ApiProperty()
  @IsInt()
  level: number;

  @Prop()
  @ApiProperty({
    description: `The required experience for levelup is calculated as:

\`\`\`js
${expRequired.toString()}
\`\`\``,
  })
  @IsInt()
  experience: number;

  @Prop({type: SchemaTypes.Mixed})
  @ApiProperty({
    type: Object,
    maxProperties: MAX_ABILITIES,
    description: 'Object whose keys are the currently known ability IDs and values are remaining uses.',
    example: {1: 15, 2: 10, 7: 5, 10: 0},
  })
  @IsObject()
  abilities: { [id: number]: number };

  @Prop()
  @ApiProperty({description: 'The persistent or maximum attributes of the monster.'})
  @ValidateNested()
  @Type(() => MonsterAttributes)
  attributes: MonsterAttributes;

  @Prop()
  @ApiProperty( {description: 'The current attributes of the monster. Resets to persistent attributes when healed.'})
  @ValidateNested()
  @Type(() => MonsterAttributes)
  currentAttributes: MonsterAttributes;

  @Prop({default: []})
  @ApiProperty()
  @IsArray()
  @IsEnum(MonsterStatus, {each: true})
  status: MonsterStatus[];
}

export type MonsterDocument = Monster & Document<Types.ObjectId, any, Monster>;

export const MonsterSchema = SchemaFactory.createForClass(Monster);
