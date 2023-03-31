import {TiledProperty} from './tiled-map.interface';

export interface Tileset {
  type: 'tileset';
  name: string;
  image: string;
  tilewidth: number;
  tileheight: number;
  tilecount: number;
  columns: number;
  tiles?: Tile[];
}

export interface Tile {
  id: number;
  properties: TiledProperty[];
}
