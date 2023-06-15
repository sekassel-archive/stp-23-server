import {Controller, Get, NotFoundException, Param, ParseIntPipe, StreamableFile} from '@nestjs/common';
import {ApiOkResponse, ApiOperation, ApiParam, ApiTags} from '@nestjs/swagger';
import * as  fs from 'node:fs';
import {NotFound} from '../../util/not-found.decorator';
import {
  abilities,
  Ability,
  AbilityDto,
  AttributeEffect,
  characters,
  ItemType,
  ItemTypeDto,
  itemTypes,
  MonsterType,
  MonsterTypeDto,
  monsterTypes,
} from '../constants';
import {Throttled} from "../../util/throttled.decorator";
import {Throttle} from "@nestjs/throttler";
import {environment} from "../../environment";

const CHARACTER_RATE_LIMIT = Math.ceil(characters.length / 30) * 30;
const MONSTER_RATE_LIMIT = Math.ceil(monsterTypes.length / 30) * 30;

@Controller('presets')
@ApiTags('Presets')
@Throttled()
export class PresetsController {
  @Get('tilesets/:filename')
  @ApiOkResponse({
    description: 'Either a Tileset in [JSON format](https://doc.mapeditor.org/en/stable/reference/json-map-format/#tileset), or a tile image PNG.',
    content: {
      'application/json': {},
      'image/png': {},
    }
  })
  @NotFound()
  getTileset(
    @Param('filename') filename: string,
  ): Promise<StreamableFile> {
    filename = filename.substring(filename.lastIndexOf('/') + 1);
    return this.stream('assets/tilesets/', filename);
  }

  @Get('characters')
  @ApiOkResponse({type: [String]})
  getCharacters(): string[] {
    return characters;
  }

  @Get('characters/:filename')
  @ApiOperation({
    description: `NOTE: This endpoint is throttled to ${CHARACTER_RATE_LIMIT} requests per ${environment.rateLimit.presetsTtl}s.`,
  })
  @ApiOkResponse({
    description: 'A character image PNG.',
    content: {'image/png': {}}
  })
  @NotFound()
  @Throttle(CHARACTER_RATE_LIMIT, environment.rateLimit.presetsTtl)
  async getCharacter(
    @Param('filename') filename: string,
  ): Promise<StreamableFile> {
    filename = filename.substring(filename.lastIndexOf('/') + 1);
    if (!filename.endsWith('.png')) {
      throw new NotFoundException(filename);
    }
    return this.stream('assets/characters/', filename);
  }

  private async stream(folder: string, filename: string) {
    const path = folder + filename;
    if (!(await fs.promises.access(path).then(() => true, () => false))) {
      throw new NotFoundException(filename);
    }
    return new StreamableFile(fs.createReadStream(path));
  }

  @Get('items')
  @ApiOkResponse({type: [ItemTypeDto]})
  getItems(): ItemTypeDto[] {
    return itemTypes.map(i => this.maskItem(i));
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

  @Get('items/:id/image')
  @NotFound()
  getItemImage(
    @Param('id', ParseIntPipe) id: number,
  ): StreamableFile | undefined {
    const item = itemTypes.find(m => m.id === id);
    return item && new StreamableFile(fs.createReadStream('assets/items/' + item.image));
  }

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

  @Get('monsters/:id/image')
  @ApiOperation({
    description: `NOTE: This endpoint is throttled to ${MONSTER_RATE_LIMIT} requests per ${environment.rateLimit.presetsTtl}s.`,
  })
  @ApiOkResponse({
    description: 'A monster image PNG.',
    content: {'image/png': {}},
  })
  @NotFound()
  @Throttle(MONSTER_RATE_LIMIT, environment.rateLimit.presetsTtl)
  async getMonsterImage(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StreamableFile | undefined> {
    const monster = monsterTypes.find(m => m.id === id);
    return monster && this.stream('assets/monsters/', monster.image);
  }

  private maskMonster(monster: MonsterType): MonsterTypeDto {
    const {evolution, ...masked} = monster;
    return masked;
  }

  private maskItem(item: ItemType): ItemTypeDto {
    const {effects, 'catch': c, ...masked} = item;
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
    const damageEffect = effects.find((e): e is AttributeEffect => 'attribute' in e && e.attribute === 'health' && e.amount < 0);
    return {
      ...masked,
      accuracy: Math.max(...effects.map(e => e.chance ?? 1)),
      power: damageEffect ? -damageEffect.amount : 0,
    };
  }
}
