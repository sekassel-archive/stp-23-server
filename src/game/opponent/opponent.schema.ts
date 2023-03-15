import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {Equals, IsIn, IsInt, IsMongoId, ValidateNested} from 'class-validator';
import {Document, Types} from 'mongoose';
import {
  GLOBAL_SCHEMA_OPTIONS,
  GLOBAL_SCHEMA_WITHOUT_ID_OPTIONS,
  GlobalSchema, GlobalSchemaWithoutID,
  MONGO_ID_FORMAT,
} from '../../util/schema';
import {abilities} from '../constants';

@Schema()
export class AbilityMove {
  static type = 'ability' as const;

  @ApiProperty()
  @Equals(AbilityMove.type)
  type: typeof AbilityMove.type;

  @ApiProperty()
  @IsInt()
  @IsIn(abilities.map(a => a.id))
  ability: number;

  @ApiProperty({...MONGO_ID_FORMAT, description: 'Opponent ID'})
  @IsMongoId()
  target: string;
}

@Schema()
export class ChangeMonsterMove {
  static type = 'change-monster' as const;

  @ApiProperty()
  @Equals(ChangeMonsterMove.type)
  type: typeof ChangeMonsterMove.type;

  @ApiProperty({...MONGO_ID_FORMAT, description: 'Monster ID'})
  @IsMongoId()
  monster: string;
}

export type Move = AbilityMove | ChangeMonsterMove;

@Schema(GLOBAL_SCHEMA_WITHOUT_ID_OPTIONS)
export class Opponent extends GlobalSchemaWithoutID {
  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  encounter: string;

  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  trainer: string;

  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  monster: string;

  @Prop({type: Object})
  @ApiProperty()
  @ValidateNested()
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        {value: AbilityMove, name: AbilityMove.type},
        {value: ChangeMonsterMove, name: ChangeMonsterMove.type},
      ],
    },
  })
  move?: Move;
}

export type OpponentDocument = Opponent & Document<Types.ObjectId, any, Opponent>;

export const OpponentSchema = SchemaFactory.createForClass(Opponent)
  .index({encounter: 1, trainer: 1}, {unique: true})
;
