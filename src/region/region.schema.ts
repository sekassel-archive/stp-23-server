import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {IsNotEmpty, IsNumber, MaxLength} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema} from '../util/schema';

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Region extends GlobalSchema {
  @Prop({index: 1})
  @ApiProperty({minLength: 1, maxLength: 32})
  @IsNotEmpty()
  @MaxLength(32)
  name: string;

  @Prop({default: 0})
  @ApiProperty()
  @IsNumber()
  members: number;
}

export type RegionDocument = Region & Document<Types.ObjectId, any, Region>;

export const RegionSchema = SchemaFactory.createForClass(Region);
