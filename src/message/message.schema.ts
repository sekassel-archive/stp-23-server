import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { Document, Types } from 'mongoose';
import { Namespace } from '../member-resolver/member-resolver.service';
import { GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT } from '../util/schema';

export const MAX_BODY_SIZE = 16 * 1024;

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Message extends GlobalSchema {
  @Prop({ transform: () => undefined })
  @IsEnum(Namespace)
  namespace: Namespace;

  @Prop({ transform: () => undefined })
  @IsMongoId()
  parent: string;

  @Prop()
  @IsMongoId()
  @ApiProperty(MONGO_ID_FORMAT)
  sender: string;

  @Prop()
  @IsString()
  @IsNotEmpty()
  @IsByteLength(0, MAX_BODY_SIZE, { message: `Body must be no longer than ${MAX_BODY_SIZE} characters` })
  @ApiProperty({ maxLength: MAX_BODY_SIZE })
  body: string;
}

export type MessageDocument = Message & Document<Types.ObjectId>;

export const MessageSchema = SchemaFactory.createForClass(Message)
  .index({ namespace: 1, parent: 1 });
