import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {IsMongoId, IsNotEmpty, IsObject, MaxLength} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema} from '../../util/schema';

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Area extends GlobalSchema {
  @Prop()
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  region: string;

  @Prop()
  @ApiProperty({minLength: 1, maxLength: 32})
  @IsNotEmpty()
  @MaxLength(32)
  name: string;

  @Prop({type: Object})
  @ApiProperty()
  @IsObject()
  map: Record<string, unknown>;
}

export type CreateAreaDto = Omit<Area, keyof GlobalSchema>;

export type AreaDocument = Area & Document<Types.ObjectId, any, Area>;

export const AreaSchema = SchemaFactory.createForClass(Area);
