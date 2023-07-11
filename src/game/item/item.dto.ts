import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, NotEquals} from 'class-validator';
import {ItemAction} from "./item.action";
import {MONGO_ID_FORMAT} from "../../util/schema";

export class UpdateItemDto {
  @ApiProperty({enum: ItemAction})
  @IsEnum(ItemAction, {message: 'Action must be `use` or `trade`'})
  @IsNotEmpty()
  action: ItemAction;

  @ApiProperty()
  @IsNumber()
  @NotEquals(0, {message: 'Amount must not be 0'})
  amount: number;

  @ApiProperty()
  @IsNumber()
  type: number;

  @ApiPropertyOptional({...MONGO_ID_FORMAT})
  @IsOptional()
  @IsMongoId()
  monster?: string;
}
