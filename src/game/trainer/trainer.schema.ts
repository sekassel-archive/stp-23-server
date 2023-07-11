import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_OPTIONS, GlobalSchema, MONGO_ID_ARRAY_FORMAT, MONGO_ID_FORMAT} from '../../util/schema';
import {characters, MAX_TEAM_SIZE} from '../constants';

export enum Direction {
  RIGHT,
  UP,
  LEFT,
  DOWN,
}

export type Path = [number, number, Direction?][];

export class NPCInfo {
  @ApiProperty({description: 'Whether the NPC should walk randomly. Handled by the server.'})
  @IsBoolean()
  walkRandomly: boolean;

  @ApiProperty({description: 'Whether the NPC will start an encounter on sight. Handled by the server.'})
  @IsBoolean()
  encounterOnSight: boolean;

  @ApiProperty({description: 'Whether the NPC will start an encounter when talked to.'})
  @IsBoolean()
  encounterOnTalk: boolean;

  @ApiProperty({description: 'Whether the NPC can heal the player\'s team (nurse).'})
  @IsBoolean()
  canHeal: boolean;

  @ApiPropertyOptional({type: [[Number]]})
  @IsOptional()
  path?: Path;

  @ApiPropertyOptional({description: 'The Trainer IDs that the NPC has encountered. ' +
      'Applies to both encounters and NPCs that offer starters, so they cannot be received again.'})
  @IsOptional()
  @IsArray()
  @IsMongoId({each: true})
  encountered?: string[];

  @ApiPropertyOptional({description: 'Monster IDs that the NPC offers as starters.', type: [Number]})
  @IsOptional()
  @IsArray()
  @IsInt({each: true})
  starters?: number[];
}

@Schema(GLOBAL_SCHEMA_OPTIONS)
export class Trainer extends GlobalSchema {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  region: string;

  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  user: string;

  @Prop()
  @ApiProperty()
  @IsString()
  name: string;

  @Prop()
  @ApiProperty()
  @IsIn(characters)
  image: string;

  @Prop()
  @ApiProperty()
  @IsInt()
  coins: number;

  @Prop({maxlength: MAX_TEAM_SIZE})
  @ApiProperty({...MONGO_ID_ARRAY_FORMAT, maxLength: MAX_TEAM_SIZE})
  @IsArray()
  @IsMongoId({each: true})
  @ArrayMaxSize(MAX_TEAM_SIZE)
  team: string[];

  @Prop()
  @ApiProperty({type: [Number]})
  @IsArray()
  @IsInt({each: true})
  encounteredMonsterTypes: number[];

  @Prop({default: []})
  @ApiProperty({...MONGO_ID_ARRAY_FORMAT})
  @IsArray()
  @IsMongoId({each: true})
  visitedAreas: string[];

  @Prop({index: 1})
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  area: string;

  @Prop()
  @ApiProperty()
  @IsInt()
  x: number;

  @Prop()
  @ApiProperty()
  @IsInt()
  y: number;

  @Prop()
  @ApiProperty()
  @IsEnum(Direction)
  direction: Direction;

  @Prop()
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => NPCInfo)
  npc?: NPCInfo;
}

export type TrainerDocument = Trainer & Document<Types.ObjectId, any, Trainer>;

export const TrainerSchema = SchemaFactory.createForClass(Trainer)
  .index({region: 1, user: 1}, {unique: true})
;
