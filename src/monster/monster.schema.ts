import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {ArrayMaxSize, IsArray, IsInt, IsMongoId, ValidateNested} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT} from '../util/schema';

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
  initiative: number;
}

export const MAX_ABILITIES = 4;

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Monster extends GlobalSchema {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  player: string;

  @Prop()
  @ApiProperty()
  @IsInt()
  type: number;

  @Prop()
  @ApiProperty()
  @IsInt()
  level: number;

  @Prop()
  @ApiProperty()
  @IsInt()
  experience: number;

  @Prop()
  @ApiProperty()
  @IsArray()
  @IsInt({each: true})
  @ArrayMaxSize(MAX_ABILITIES)
  abilities: number[];

  @Prop()
  @ApiProperty()
  @ValidateNested()
  @Type(() => MonsterAttributes)
  attributes: MonsterAttributes;

  @Prop()
  @ApiProperty()
  @ValidateNested()
  @Type(() => MonsterAttributes)
  currentAttributes: MonsterAttributes;
}

export type MonsterDocument = Monster & Document<Types.ObjectId, any, Monster>;

export const MonsterSchema = SchemaFactory.createForClass(Monster)
  .index({region: 1, user: 1}, {unique: true, ignoreUndefined: true})
;
