// Regenerates the extension icon set from the MonoStart logo on a brand-black
// tile. The logo is a white stroke, so it needs an opaque background to stay
// visible on light surfaces (browser toolbar, Chrome Web Store form).
//
// Outputs (this script is the single source of truth for the brand mark):
//   public/icons/icon-{16,32,48,128}.png  — rounded black tile (manifest/action)
//   public/favicon.svg                      — rounded black tile (browser tab)
//   <store dir>/store-icon-128.png          — full square, NO alpha (store listing)
//
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ICON_DIR = resolve(ROOT, 'public/icons');
const STORE_DIR = '/Users/paurushrai/Downloads/chrome-professional';

const BRAND_BLACK = '#000000';
const LOGO_WHITE = '#ffffff';
// MonoStart logo: the hexagon outline (Lucide "hexagon"), 24-unit space.
// The in-app header renders this same glyph via lucide-react's <Hexagon />.
const LOGO_PATH =
  'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z';

// Center the 24-unit logo on the 128 canvas, leaving padding around it.
const LOGO_SCALE = 3.2; // 24 * 3.2 = 76.8px glyph inside a 128px tile
const LOGO_OFFSET = Math.round(((128 - 24 * LOGO_SCALE) / 2) * 100) / 100; // = 25.6 (rounded to avoid float noise in output SVG)
const CORNER_RADIUS = 28;
const RENDER_DENSITY = 288; // render SVG at ~512px then downscale → crisp small icons

const tileSvg = (cornerRadius) => `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="${cornerRadius}" fill="${BRAND_BLACK}"/>
  <g transform="translate(${LOGO_OFFSET} ${LOGO_OFFSET}) scale(${LOGO_SCALE})" fill="none" stroke="${LOGO_WHITE}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="${LOGO_PATH}"/>
  </g>
</svg>`;

const render = (svg) => sharp(Buffer.from(svg), { density: RENDER_DENSITY });

async function main() {
  mkdirSync(ICON_DIR, { recursive: true });

  // Manifest / action icons: rounded tile (transparent corners are fine here).
  const roundedSvg = tileSvg(CORNER_RADIUS);
  for (const size of [16, 32, 48, 128]) {
    const out = resolve(ICON_DIR, `icon-${size}.png`);
    await render(roundedSvg).resize(size, size).png().toFile(out);
    console.log(`wrote ${out} (${size}x${size})`);
  }

  // Favicon: the same rounded tile as an SVG, so the browser tab shows the
  // brand mark on any tab-strip color (white glyph on transparent vanished on
  // light tabs). Generated here so it can never drift from the PNG icons.
  const faviconOut = resolve(ROOT, 'public/favicon.svg');
  writeFileSync(faviconOut, `${roundedSvg}\n`);
  console.log(`wrote ${faviconOut}`);

  // Store-listing icon: full square, flattened onto black → guaranteed no alpha.
  const squareSvg = tileSvg(0);
  const storeOut = resolve(STORE_DIR, 'store-icon-128.png');
  await render(squareSvg).resize(128, 128).flatten({ background: BRAND_BLACK }).png().toFile(storeOut);
  console.log(`wrote ${storeOut} (128x128, no alpha)`);
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
