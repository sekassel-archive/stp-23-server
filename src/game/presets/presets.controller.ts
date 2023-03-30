import {Controller, Get, Param, ParseIntPipe, StreamableFile} from '@nestjs/common';
import {ApiOkResponse, ApiParam, ApiTags} from '@nestjs/swagger';
import * as  fs from 'node:fs';
import {NotFound} from '../../util/not-found.decorator';
import {
  abilities,
  Ability,
  AbilityDto,
  characters,
  ItemType,
  ItemTypeDto,
  itemTypes,
  MonsterType,
  MonsterTypeDto,
  monsterTypes
} from '../constants';

@Controller('presets')
@ApiTags('Presets')
export class PresetsController {
  @Get('tilesets/:filename')
  getTileset(
    @Param('filename') filename: string,
  ): StreamableFile {
    filename = filename.substring(filename.lastIndexOf('/') + 1);
    return new StreamableFile(fs.createReadStream('assets/tilesets/' + filename));
  }

  @Get('characters')
  @ApiOkResponse({type: [String]})
  getCharacters(): string[] {
    return characters;
  }

  @Get('characters/:filename')
  getCharacter(
    @Param('filename') filename: string,
  ): StreamableFile {
    filename = filename.substring(filename.lastIndexOf('/') + 1);
    return new StreamableFile(fs.createReadStream('assets/characters/' + filename));
  }

  @Get('monsters')
  @ApiOkResponse({type: [MonsterTypeDto]})
  getMonsters(): MonsterTypeDto[] {
    return monsterTypes.map(m => this.maskMonster(m));
  }

  @Get('items')
  @ApiOkResponse({type: [ItemTypeDto]})
  getItems(): ItemTypeDto[] {
    return itemTypes.map(i => this.maskItem(i));
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

  @Get('items/:id')
  @NotFound()
  @ApiOkResponse({type: ItemTypeDto})
  @ApiParam({name: 'id', type: 'number'})
  getItem(
    @Param('id', ParseIntPipe) id: number,
  ): ItemTypeDto | undefined {
    const item = itemTypes.find(i => i.id === id);
    return item && this.maskItem(item);
  }

  @Get('monsters/:id/image')
  @NotFound()
  getMonsterImage(
    @Param('id', ParseIntPipe) id: number,
  ): StreamableFile | undefined {
    const monster = monsterTypes.find(m => m.id === id);
    return monster && new StreamableFile(fs.createReadStream('assets/monsters/' + monster.image));
  }

  private maskMonster(monster: MonsterType): MonsterTypeDto {
    const {evolution, ...masked} = monster;
    return masked;
  }

  private maskItem(item: ItemType): ItemTypeDto {
    const {...masked} = item;
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
    const damageEffect = effects.find(e => e.attribute === 'health' && e.amount < 0);
    return {
      ...masked,
      accuracy: Math.max(...effects.map(e => e.chance ?? 1)),
      power: damageEffect ? -damageEffect.amount : 0,
    };
  }
}
