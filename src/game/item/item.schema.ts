import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT} from "../../util/schema";
import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {ApiProperty} from "@nestjs/swagger";
import {IsInt, IsMongoId} from "class-validator";
import {Document, Types} from "mongoose";

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Item extends GlobalSchema {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  trainer: string;

  @Prop()
  @ApiProperty()
  @IsMongoId()
  id: string;

  @Prop()
  @ApiProperty()
  @IsInt()
  type: number;

  @Prop()
  @ApiProperty()
  @IsInt()
  amount: number;
}

export type ItemDocument = Item & Document<Types.ObjectId, any, Item>;

export const ItemSchema = SchemaFactory.createForClass(Item)
  .index({trainer: 1, type: 1}, {unique:true})
;
