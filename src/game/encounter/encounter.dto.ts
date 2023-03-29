import {PickType} from '@nestjs/swagger';
import {Encounter} from './encounter.schema';

export class CreateEncounterDto extends PickType(Encounter, ['isWild'] as const) {
}
