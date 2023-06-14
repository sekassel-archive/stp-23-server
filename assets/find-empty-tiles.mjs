import {createCanvas, loadImage} from "canvas";
import * as fs from "node:fs/promises";
import BitSet from "bitset";

const region = 'Albertania';
const tilesetName = 'Modern_Exteriors_16x16';
const imagePath = `tilesets/${tilesetName}.png`;
const tileSize = 16;

const image = await loadImage(imagePath);
const emptyTiles = findEmptyTilesIndices(image, tileSize);

const tileset = JSON.parse(await fs.readFile(`tilesets/${tilesetName}.json`, 'utf-8'));
const newTiles = tileset.tiles.filter(t => !emptyTiles.get(t.id));
const changed = tileset.tiles.length - newTiles.length;
if (changed) {
  tileset.tiles = newTiles;
  console.log(`Removed ${changed} empty tiles from ${tilesetName}.json`);
  await fs.writeFile(`tilesets/${tilesetName}.json`, JSON.stringify(tileset, null, '\t'));
}

for (const file of await fs.readdir(`maps/${region}/`)) {
  const map = JSON.parse(await fs.readFile(`maps/${region}/${file}`, 'utf-8'));
  if (!map.tilesets[0].source.includes(tilesetName)) {
    continue;
  }

  let changed = 0;
  for (const layer of map.layers) {
    for (const chunk of layer.chunks || []) {
      for (let i = 0; i < chunk.data.length; i++) {
        const tileIndex = chunk.data[i] - 1;
        if (emptyTiles.get(tileIndex)) {
          chunk.data[i] = 0;
          changed++;
        }
      }
    }
  }
  if (changed) {
    console.log(`Removed ${changed} empty tiles from map ${file}`);
    await fs.writeFile(`maps/${region}/${file}`, JSON.stringify(map, null, '\t'));
  }
}

function findEmptyTilesIndices(image, tileSize) {
  const emptyTilesIndices = new BitSet();

  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);

  const numRows = Math.floor(image.height / tileSize);
  const numCols = Math.floor(image.width / tileSize);

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const tileX = col * tileSize;
      const tileY = row * tileSize;

      const isEmpty = isTileEmpty(context, tileX, tileY, tileSize);

      if (isEmpty) {
        emptyTilesIndices.set(row * numCols + col);
      }
    }
  }

  return emptyTilesIndices;
}

function isTileEmpty(context, x, y, size) {
  const imageData = context.getImageData(x, y, size, size).data;

  for (let i = 0; i < imageData.length; i += 4) {
    const alpha = imageData[i + 3];

    if (alpha !== 0) {
      return false;
    }
  }

  return true;
}
