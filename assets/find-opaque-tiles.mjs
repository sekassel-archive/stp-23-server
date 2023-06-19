import {createCanvas, loadImage} from "canvas";
import BitSet from "bitset";
import * as fs from "node:fs/promises";
import {createWriteStream} from "fs";

const tilesetName = 'Modern_Exteriors_16x16';
const imagePath = `tilesets/${tilesetName}.png`;
const tileSize = 16;

const image = await loadImage(imagePath);
const tileset = JSON.parse(await fs.readFile(`tilesets/${tilesetName}.json`, 'utf-8'));
const {canvas, context, opaqueTilesIndices} = findOpaqueTilesIndices(image, tileSize);

for (const tile of tileset.tiles) {
  const x = tile.id % tileset.columns;
  const y = Math.floor(tile.id / tileset.columns);
  const roof = tile.properties.some(p => p.name === 'Roof');
  const walkable = tile.properties.some(p => p.name === 'Walkable');

  if (opaqueTilesIndices.get(tile.id) && roof && walkable) {
    context.strokeStyle = 'red';
    context.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);

    console.log(`❌ Tile ${tile.id} at ${x} ${y} is opaque and has a Walkable Roof property`);
  }
  /*
  const tileBelow = tileset.tiles.find(t => t.id === tile.id + tileset.columns);
  if (!roof && tileBelow && tileBelow.properties.some(p => p.name === 'Roof') && tileBelow.properties.some(p => p.name === 'Walkable')) {
    context.strokeStyle = 'green';
    context.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);

    console.log(`❌ Tile ${tile.id} at ${x} ${y} is not a roof but has a Walkable Roof tile below`);
  }
   */
}

canvas.createPNGStream().pipe(createWriteStream(`tilesets/${tilesetName}-opaque.png`));

function findOpaqueTilesIndices(image, tileSize) {
  const opaqueTilesIndices = new BitSet();

  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);

  const numRows = Math.floor(image.height / tileSize);
  const numCols = Math.floor(image.width / tileSize);

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const tileX = col * tileSize;
      const tileY = row * tileSize;

      if (isTileOpaque(context, tileX, tileY, tileSize)) {
        opaqueTilesIndices.set(row * numCols + col);
      }
    }
  }

  return {canvas, context, opaqueTilesIndices};
}

function isTileOpaque(context, x, y, size) {
  const imageData = context.getImageData(x, y, size, size).data;

  for (let i = 0; i < imageData.length; i += 4) {
    const alpha = imageData[i + 3];
    if (alpha < 255) {
      return false;
    }
  }

  return true;
}
