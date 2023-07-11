import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {IsMongoId, IsNumber, IsOptional, NotEquals} from 'class-validator';
import {MONGO_ID_FORMAT} from "../../util/schema";

export class UpdateItemDto {
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
