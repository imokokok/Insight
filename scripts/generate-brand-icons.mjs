import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const source = path.join(projectRoot, 'public/logos/insight-glacier-cut.svg');
const appDirectory = path.join(projectRoot, 'src/app');

const renderSquarePng = async (size, padding, background) => {
  const contentSize = size - padding * 2;
  const image = sharp(await readFile(source))
    .resize({ width: contentSize, height: contentSize, fit: 'contain', background })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background,
    });

  if (typeof background === 'string') {
    image.flatten({ background });
  }

  return image.png().toBuffer();
};

const createIco = (images) => {
  const headerSize = 6;
  const directoryEntrySize = 16;
  const directorySize = images.length * directoryEntrySize;
  const header = Buffer.alloc(headerSize + directorySize);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let imageOffset = header.length;
  images.forEach(({ size, data }, index) => {
    const entryOffset = headerSize + index * directoryEntrySize;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(data.length, entryOffset + 8);
    header.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += data.length;
  });

  return Buffer.concat([header, ...images.map(({ data }) => data)]);
};

await mkdir(appDirectory, { recursive: true });
await copyFile(source, path.join(appDirectory, 'icon.svg'));

const faviconSizes = [16, 32, 48, 256];
const faviconImages = await Promise.all(
  faviconSizes.map(async (size) => ({
    size,
    data: await renderSquarePng(size, Math.max(1, Math.round(size * 0.08)), {
      r: 0,
      g: 0,
      b: 0,
      alpha: 0,
    }),
  }))
);

await writeFile(path.join(appDirectory, 'favicon.ico'), createIco(faviconImages));

const appleIcon = await renderSquarePng(180, 18, '#F8F7F4');
await writeFile(path.join(appDirectory, 'apple-icon.png'), appleIcon);

console.log('Generated glacier favicon.ico, icon.svg, and apple-icon.png');
