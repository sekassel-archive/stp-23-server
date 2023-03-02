import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {IsInt, IsMongoId, IsOptional} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT} from '../../util/schema';

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Opponent extends GlobalSchema {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  encounter: string;

  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  trainer: string;

  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  monster: string;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  action?: number;
}

export type OpponentDocument = Opponent & Document<Types.ObjectId, any, Opponent>;

export const OpponentSchema = SchemaFactory.createForClass(Opponent);
