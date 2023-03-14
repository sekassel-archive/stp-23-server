import {Controller, Get, Param, ParseIntPipe} from '@nestjs/common';
import {ApiOkResponse, ApiParam, ApiTags} from '@nestjs/swagger';
import {NotFound} from '../../util/not-found.decorator';
import {abilities, Ability, AbilityDto, MonsterType, MonsterTypeDto, monsterTypes} from '../constants';

@Controller('presets')
@ApiTags('Presets')
export class PresetsController {
  @Get('monsters')
  @ApiOkResponse({type: [MonsterTypeDto]})
  getMonsters(): MonsterTypeDto[] {
    return monsterTypes.map(m => this.maskMonster(m));
  }

  @Get('monsters/:id')
  @NotFound()
  @ApiOkResponse({type: MonsterTypeDto})
  @ApiParam({name: 'id', type: 'number'})
  getMonster(
    @Param('id', ParseIntPipe) id: number,
  ): MonsterTypeDto | undefined {
    const monster = monsterTypes.find(m => m.id === id);
    return monster && this.maskMonster(monster);
  }

  private maskMonster(monster: MonsterType): MonsterTypeDto {
    const {evolution, ...masked} = monster;
    return masked;
  }

  @Get('abilities')
  @ApiOkResponse({type: [AbilityDto]})
  getAbilities(): AbilityDto[] {
    return abilities.map(a => this.maskAbility(a));
  }

  @Get('abilities/:id')
  @NotFound()
  @ApiOkResponse({type: AbilityDto})
  @ApiParam({name: 'id', type: 'number'})
  getAbility(
    @Param('id', ParseIntPipe) id: number,
  ): AbilityDto | undefined {
    const ability = abilities.find(a => a.id === id);
    return ability && this.maskAbility(ability);
  }

  private maskAbility(ability: Ability): AbilityDto {
    const {minLevel, effects, ...masked} = ability;
    return masked;
  }
}
