import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {IsMongoId, IsNotEmpty, IsObject} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema} from '../util/schema';

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Area extends GlobalSchema {
  @Prop()
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  region: string;

  @Prop()
  @ApiProperty()
  @IsObject()
  map: Record<string, unknown>;
}

export type AreaDocument = Area & Document<Types.ObjectId, never, Area>;

export const AreaSchema = SchemaFactory.createForClass(Area);
