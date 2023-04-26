import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsInt, IsMongoId, IsObject, ValidateNested} from 'class-validator';
import {Document, SchemaTypes, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT} from '../../util/schema';

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

export const MAX_ABILITIES = 4;

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
  @ApiProperty()
  @IsInt()
  experience: number;

  @Prop({type: SchemaTypes.Mixed})
  @ApiProperty({type: Object, maxProperties: MAX_ABILITIES})
  @IsObject()
  abilities: { [id: number]: number };

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

export const MonsterSchema = SchemaFactory.createForClass(Monster);
