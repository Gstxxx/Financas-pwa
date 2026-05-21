// Render the SVG app icon into a multi-resolution Windows ICO file.
// electron-builder needs build/icon.ico to brand the .exe and installer.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const svgPath = join(root, 'public', 'icon.svg');
const outDir = join(root, 'build');
const outIco = join(outDir, 'icon.ico');

const SIZES = [16, 24, 32, 48, 64, 128, 256];

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

const pngs = SIZES.map((size) => {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'transparent',
  });
  return resvg.render().asPng();
});

// png-to-ico packs each PNG into an ICO directory entry. The resulting
// .ico embeds all sizes so Windows picks the right one per context.
const ico = await pngToIco(pngs);
writeFileSync(outIco, ico);

console.log(`build-icon: wrote ${outIco} with sizes [${SIZES.join(', ')}]`);
