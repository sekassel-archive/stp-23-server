import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {IsMongoId} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT} from '../../util/schema';

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Encounter extends GlobalSchema {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  region: string;
}

export type EncounterDocument = Encounter & Document<Types.ObjectId>;

export const EncounterSchema = SchemaFactory.createForClass(Encounter);
