import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {IsInt, IsMongoId, IsOptional, IsString} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT} from '../util/schema';

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Player extends GlobalSchema {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  region: string;

  @Prop()
  @ApiPropertyOptional(MONGO_ID_FORMAT)
  @IsOptional()
  @IsMongoId()
  user?: string;

  @Prop()
  @ApiProperty()
  @IsInt()
  coins: number;

  @Prop()
  @ApiProperty()
  @IsString() // TODO IsMongoID?
  area: string;

  @Prop()
  @ApiProperty()
  @IsInt()
  x: number;

  @Prop()
  @ApiProperty()
  @IsInt()
  y: number;
}

export type PlayerDocument = Player & Document<Types.ObjectId, never, Player>;

export const PlayerSchema = SchemaFactory.createForClass(Player)
  .index({region: 1, user: 1}, {unique: true, ignoreUndefined: true})
;
