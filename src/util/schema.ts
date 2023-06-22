import {SchemaOptions} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {Types} from 'mongoose';
import {AsObjectId} from '@mean-stream/nestx';

export const GLOBAL_SCHEMA_OPTIONS: SchemaOptions = {
  timestamps: true,
  versionKey: false,
};

export const GLOBAL_SCHEMA_WITHOUT_ID_OPTIONS: SchemaOptions = {
  ...GLOBAL_SCHEMA_OPTIONS,
  id: false,
  toJSON: {
    virtuals: true,
    transform: (doc, converted) => {
      delete converted._id;
      delete converted.id;
    },
  },
};

export const MONGO_ID_FORMAT = {
  type: String,
  format: 'objectid',
  example: '507f191e810c19729de860ea',
};

export const MONGO_ID_ARRAY_FORMAT = {
  format: MONGO_ID_FORMAT.format,
  example: [MONGO_ID_FORMAT.example],
  type: [String],
};

export class GlobalSchemaWithoutID {
  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class GlobalSchema extends GlobalSchemaWithoutID {
  @ApiProperty(MONGO_ID_FORMAT)
  @AsObjectId()
  _id!: Types.ObjectId;
}
