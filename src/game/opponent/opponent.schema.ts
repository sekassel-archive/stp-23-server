import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiExtraModels, ApiProperty, refs} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {Equals, IsBoolean, IsIn, IsInt, IsMongoId, ValidateNested} from 'class-validator';
import {Document, Types} from 'mongoose';
import {GLOBAL_SCHEMA_WITHOUT_ID_OPTIONS, GlobalSchemaWithoutID, MONGO_ID_FORMAT} from '../../util/schema';
import {abilities} from '../constants';

@Schema()
export class AbilityMove {
  static type = 'ability' as const;

  @ApiProperty({enum: [AbilityMove.type]})
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

  @ApiProperty({enum: [ChangeMonsterMove.type]})
  @Equals(ChangeMonsterMove.type)
  type: typeof ChangeMonsterMove.type;

  @ApiProperty({...MONGO_ID_FORMAT, description: 'Monster ID'})
  @IsMongoId()
  monster: string;
}

export type Move = AbilityMove | ChangeMonsterMove;

@Schema(GLOBAL_SCHEMA_WITHOUT_ID_OPTIONS)
@ApiExtraModels(AbilityMove, ChangeMonsterMove)
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
  @ApiProperty()
  @IsBoolean()
  isAttacker: boolean;

  @Prop()
  @ApiProperty()
  @IsBoolean()
  isNPC: boolean;

  @Prop()
  @ApiProperty(MONGO_ID_FORMAT)
  @IsMongoId()
  monster: string;

  @Prop({type: Object})
  @ApiProperty({oneOf: refs(AbilityMove, ChangeMonsterMove)})
  @ValidateNested()
  @Type(() => Object, {
    keepDiscriminatorProperty: true,
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
