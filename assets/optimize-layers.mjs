import {createCanvas, loadImage} from "canvas";
import BitSet from "bitset";
import * as fs from "node:fs/promises";
import {gzipSync} from "zlib";

const region = 'Albertania';
const tilesetName = 'Modern_Exteriors_16x16';
const imagePath = `tilesets/${tilesetName}.png`;
const tileSize = 16;

const image = await loadImage(imagePath);
const opaqueTilesIndices = findOpaqueTilesIndices(image, tileSize);

for (const file of await fs.readdir(`maps/${region}/`)) {
  const map = JSON.parse(await fs.readFile(`maps/${region}/${file}`, 'utf-8'));
  const tileset = map.tilesets.find(t => t.source.includes(tilesetName));
  if (!tileset) {
    continue;
  }

  const initial = JSON.stringify(map);
  const initialSize = initial.length;
  const initialGzipSize = gzipSync(initial).length;
  const tileLayers = map.layers.filter(l => l.type === 'tilelayer');

  // Step 1: Move opaque tiles to the bottom layer
  for (let layerIndex = tileLayers.length - 1; layerIndex >= 0; layerIndex--) {
    const layer = tileLayers[layerIndex];
    for (const chunk of layer.chunks || []) {
      for (let i = 0; i < chunk.data.length; i++) {
        const tileIndex = chunk.data[i];
        if (!tileIndex || !opaqueTilesIndices.get(tileIndex - tileset.firstgid)) {
          continue;
        }

        const targetChunk = tileLayers[0].chunks.find(c => c.x === chunk.x && c.y === chunk.y);
        targetChunk.data[i] = chunk.data[i];
        for (let layerBelow = 1; layerBelow <= layerIndex; layerBelow++) {
          const chunkBelow = tileLayers[layerBelow].chunks.find(c => c.x === chunk.x && c.y === chunk.y);
          chunkBelow && (chunkBelow.data[i] = 0);
        }
      }
    }
  }

  // Step 2: Move all tiles down as far as possible
  for (let layerIndex = 0; layerIndex < tileLayers.length; layerIndex++) {
    const layer = tileLayers[layerIndex];
    for (const chunk of layer.chunks || []) {
      const chunksAbove = tileLayers.slice(layerIndex + 1).map(l => l.chunks.find(c => c.x === chunk.x && c.y === chunk.y));
      for (let i = 0; i < chunk.data.length; i++) {
        const tileIndex = chunk.data[i];
        if (tileIndex) {
          continue;
        }

        for (const chunkAbove of chunksAbove) {
          if (chunkAbove?.data[i]) {
            chunk.data[i] = chunkAbove.data[i];
            chunkAbove.data[i] = 0;
            break;
          }
        }
      }
    }
  }

  // Step 3: Remove empty chunks
  for (const layer of tileLayers) {
    layer.chunks = layer.chunks.filter(c => c.data.some(t => t));
  }

  // Step 4: Remove empty layers
  map.layers = map.layers.filter(l => l.chunks && l.chunks.length);

  const optimized = JSON.stringify(map);
  const optimizedSize = optimized.length;
  const optimizedGzipSize = gzipSync(optimized).length;
  console.log(`${file}: 
  Minified: ${initialSize} -> ${optimizedSize} (${Math.round(100 * optimizedSize / initialSize)}%)
  Min+Gzip: ${initialGzipSize} -> ${optimizedGzipSize} (${Math.round(100 * optimizedGzipSize / initialGzipSize)}%)`);
}

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

  return opaqueTilesIndices;
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
