export interface TiledMap {
  tilewidth: number;
  tileheight: number;
  tilesets: TileSetRef[];
  layers: Layer[];
}

export interface TileSetRef {
  firstgid: number;
  source: string;
}

export type Layer = TileLayer | ObjectLayer;

export interface BaseLayer {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TileLayer extends BaseLayer {
  type: 'tilelayer';
  startx: number;
  starty: number;
  chunks: Chunk[];
}

export interface Chunk {
  x: number;
  y: number;
  width: number;
  height: number;
  data: number[];
}

export interface ObjectLayer extends BaseLayer {
  type: 'objectgroup';
  objects: TiledObject[];
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  point?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  properties?: TiledProperty[];
}

export interface TiledProperty {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'color' | 'file' | 'object';
  value: string | number | boolean;
}
