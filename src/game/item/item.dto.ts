import {ApiProperty} from '@nestjs/swagger';
import {IsEnum, IsNotEmpty, IsNumber, IsOptional, NotEquals} from 'class-validator';
import {ItemAction} from "./item.action";

export class UpdateItemDto {
  @ApiProperty({example: ""})
  @IsEnum(ItemAction, {message: 'Action must be `use` or `trade`'})
  @IsNotEmpty()
  action: ItemAction;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @NotEquals(0, {message: 'Amount must not be 0'})
  amount: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  type: number;

  @ApiProperty({example: ''})
  @IsOptional()
  monsterId?: string;
}
