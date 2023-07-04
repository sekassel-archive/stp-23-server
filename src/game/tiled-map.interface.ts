export interface TiledMap {
  tilewidth: number;
  tileheight: number;
  tilesets: TileSetRef[];
  layers: Layer[];
  properties?: TiledProperty[];
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
  data?: number[];
  chunks?: Chunk[];
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
  polygon?: {x: number, y: number}[];
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

export function getProperty<K extends string | number | boolean>(object: any, name: string): K | undefined {
  return object.properties?.find((p: any) => p.name === name)?.value as K;
}
