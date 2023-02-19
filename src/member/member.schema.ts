import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {IsMongoId} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_WITHOUT_ID_OPTIONS, GlobalSchemaWithoutID, MONGO_ID_FORMAT} from '../util/schema';

@Schema(GLOBAL_SCHEMA_WITHOUT_ID_OPTIONS)
export class Member extends GlobalSchemaWithoutID {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  region: string;

  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  user: string;
}

export type MemberDocument = Member & Document<Types.ObjectId, never, Member>;

export const MemberSchema = SchemaFactory.createForClass(Member)
  .index({gameId: 1, userId: 1}, {unique: true})
;
