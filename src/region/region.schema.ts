import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty, PickType} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsNotEmpty, IsObject, MaxLength, ValidateNested} from 'class-validator';
import {Document, Types} from 'mongoose';
import {TiledMap} from '../game/tiled-map.interface';
import {MoveTrainerDto} from '../game/trainer/trainer.dto';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema} from '../util/schema';

export class Spawn extends PickType(MoveTrainerDto, ['area', 'x', 'y'] as const) {
}

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Region extends GlobalSchema {
  @Prop({index: 1})
  @ApiProperty({minLength: 1, maxLength: 32})
  @IsNotEmpty()
  @MaxLength(32)
  name: string;

  @Prop()
  @ApiProperty()
  @ValidateNested()
  @Type(() => Spawn)
  spawn: Spawn;

  @Prop({type: Object})
  @ApiProperty({
    description: 'Tiled map in [JSON format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)',
    type: 'object',
  })
  @IsObject()
  map: TiledMap;
}

export type RegionDocument = Region & Document<Types.ObjectId, any, Region>;

export const RegionSchema = SchemaFactory.createForClass(Region);
