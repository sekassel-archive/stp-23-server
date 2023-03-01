import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {ArrayMaxSize, IsArray, IsInt, IsMongoId} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_ARRAY_FORMAT} from '../../util/schema';

const MAX_OPPONENTS = 4;

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Encounter extends GlobalSchema {
  @Prop()
  @ApiProperty(MONGO_ID_ARRAY_FORMAT)
  @IsArray()
  @IsMongoId({each: true})
  @ArrayMaxSize(MAX_OPPONENTS)
  opponents: string[];

  @Prop()
  @ApiProperty(MONGO_ID_ARRAY_FORMAT)
  @IsArray()
  @IsMongoId({each: true})
  @ArrayMaxSize(MAX_OPPONENTS)
  monsters: string[];

  @Prop()
  @ApiProperty()
  @IsInt()
  currentTurn: number;
}

export type EncounterDocument = Encounter & Document<Types.ObjectId>;

export const EncounterSchema = SchemaFactory.createForClass(Encounter);
