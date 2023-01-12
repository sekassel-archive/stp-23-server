import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Document, Types } from 'mongoose';
import { DEFAULT_VICTORY_POINTS, MAX_VICTORY_POINTS } from '../settlers/shared/constants';
import { GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_FORMAT } from '../util/schema';

export class GameSettings {
  @Prop()
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 0,
    maximum: 10,
    default: 2,
    description: 'Controls the number of rings around the center of the map. Zero means only one tile will be placed.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  mapRadius?: number;

  @Prop()
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 3,
    maximum: MAX_VICTORY_POINTS,
    default: DEFAULT_VICTORY_POINTS,
    description: 'Specifies how many victory points are required to win the game.',
  })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(MAX_VICTORY_POINTS)
  victoryPoints?: number;

  @Prop()
  @ApiPropertyOptional({
    ...MONGO_ID_FORMAT,
    description: 'ID of map template to use. If set, the mapRadius is ignored.',
  })
  @IsOptional()
  @IsMongoId()
  mapTemplate?: string;

  @Prop()
  @ApiPropertyOptional({
    default: true,
    description: 'If set to false, the server will no longer roll 7s.',
  })
  @IsOptional()
  @IsBoolean()
  roll7?: boolean;

  @Prop()
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 0,
    description: 'If set, every player starts with the specified number of each resource.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  startingResources?: number;
}

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Game extends GlobalSchema {
  @Prop({ index: 1 })
  @ApiProperty({ minLength: 1, maxLength: 32 })
  @IsNotEmpty()
  @MaxLength(32)
  name: string;

  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  owner: string;

  @Prop({ default: 0 })
  @ApiProperty()
  @IsNumber()
  members: number;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  started?: boolean;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GameSettings)
  settings?: GameSettings;

  @Prop({
    transform: () => undefined,
  })
  passwordHash: string;
}

export type GameDocument = Game & Document<Types.ObjectId>;

export const GameSchema = SchemaFactory.createForClass(Game);
