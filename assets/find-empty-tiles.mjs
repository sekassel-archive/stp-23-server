import {createCanvas, loadImage} from "canvas";

// Replace 'spritesheet.png' with the path to your spritesheet image
const imagePath = 'tilesets/Modern_Exteriors_16x16.png';
const tileSize = 16;

const image = await loadImage(imagePath);
const emptyTiles = findEmptyTilesIndices(image, tileSize);
console.log(emptyTiles);

function findEmptyTilesIndices(image, tileSize) {
  const emptyTilesIndices = [];

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
        emptyTilesIndices.push(row * numCols + col);
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
