import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty, ApiPropertyOptional, PickType} from '@nestjs/swagger';
import {IsMongoId, IsNotEmpty, IsObject, IsOptional, MaxLength, ValidateNested} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema} from '../../util/schema';
import {TiledMap} from '../tiled-map.interface';
import {Type} from "class-transformer";
import {Spawn} from "../../region/region.schema";
import {Trainer} from "../trainer/trainer.schema";

export class Position extends PickType(Trainer, ['x', 'y'] as const) {
}

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

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => Position)
  spawn?: Position;

  @Prop({type: Object})
  @ApiProperty({
    description: 'Tiled map in [JSON format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)',
    type: 'object',
  })
  @IsObject()
  map: TiledMap;
}

export type CreateAreaDto = Omit<Area, keyof GlobalSchema>;

export type AreaDocument = Area & Document<Types.ObjectId, any, Area>;

export const AreaSchema = SchemaFactory.createForClass(Area);
