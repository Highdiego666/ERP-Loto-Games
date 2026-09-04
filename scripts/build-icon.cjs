'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const input = path.join(root, 'assets', 'img', 'loto-games-logo.svg');
const outputDir = path.join(root, 'build');
const output = path.join(outputDir, 'icon.ico');
const sizes = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  const svg = await fs.readFile(input);
  const images = [];

  for (const size of sizes) {
    images.push(await sharp(svg, { density: 384 })
      .resize(size, size, {
        fit: 'contain',
        background: { r: 5, g: 9, b: 20, alpha: 1 }
      })
      .png()
      .toBuffer());
  }

  const headerSize = 6 + (16 * images.length);
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = headerSize;
  images.forEach((image, index) => {
    const size = sizes[index];
    const pos = 6 + (index * 16);
    header.writeUInt8(size === 256 ? 0 : size, pos);
    header.writeUInt8(size === 256 ? 0 : size, pos + 1);
    header.writeUInt8(0, pos + 2);
    header.writeUInt8(0, pos + 3);
    header.writeUInt16LE(1, pos + 4);
    header.writeUInt16LE(32, pos + 6);
    header.writeUInt32LE(image.length, pos + 8);
    header.writeUInt32LE(offset, pos + 12);
    offset += image.length;
  });

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(output, Buffer.concat([header, ...images]));
  console.log(`Icono Windows generado: ${output}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
