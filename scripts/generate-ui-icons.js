// Renders the Feather icons used in the UI to PNG files in src/assets/icons (1x, 2x and 3x).
// The icons are white and get their color from `tintColor` at runtime.
// Usage: npm install --no-save sharp feather-icons && node scripts/generate-ui-icons.js
// Feather icons: https://feathericons.com (MIT license).
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const feather = require('feather-icons');

const OUT = path.join(__dirname, '..', 'src', 'assets', 'icons');
const NAMES = [
  'alert-circle',
  'arrow-left',
  'calendar',
  'check-circle',
  'check-square',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'clock',
  'flag',
  'plus-circle',
  'rotate-ccw',
  'save',
  'sliders',
  'square',
];
const SIZE = 24;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const name of NAMES) {
    const svg = feather.icons[name].toSvg({ color: '#FFFFFF', width: SIZE, height: SIZE });
    for (const scale of [1, 2, 3]) {
      const file = path.join(OUT, scale === 1 ? `${name}.png` : `${name}@${scale}x.png`);
      await sharp(Buffer.from(svg), { density: 72 * scale })
        .resize(SIZE * scale, SIZE * scale)
        .png({ compressionLevel: 9 })
        .toFile(file);
    }
    console.log('wrote', name);
  }
})();
