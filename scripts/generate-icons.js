// Draws the app icon (a speedometer gauge with "KM") and writes every size the apps need:
// - assets/icon.png                 master icon, also shown in the app header
// - android/.../mipmap-*            adaptive (foreground, background, monochrome), legacy and round icons
// - ios/.../AppIcon.appiconset      1024 px App Store / home screen icon
// Usage: npm install --no-save sharp && node scripts/generate-icons.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const IOS_ICONS = path.join(ROOT, 'ios', 'KmCalc', 'Images.xcassets', 'AppIcon.appiconset');

const BG_TOP = '#4A76FF';
const BG_BOTTOM = '#1B3CC4';
const ACCENT = '#FFB020';

const CENTER = { x: 512, y: 540 };
const RADIUS = 300;
const STROKE = 58;
const START_DEG = 210;
const SWEEP_DEG = 240;
const NEEDLE_FRACTION = 0.62;
const ZONE_FROM = 0.84;

const rad = (deg) => (deg * Math.PI) / 180;
const f = (n) => n.toFixed(1);
const pointAt = (deg, r = RADIUS) => [CENTER.x + r * Math.cos(rad(deg)), CENTER.y - r * Math.sin(rad(deg))];
const degAt = (fraction) => START_DEG - fraction * SWEEP_DEG;

function arcPath(from, to) {
  const [x0, y0] = pointAt(degAt(from));
  const [x1, y1] = pointAt(degAt(to));
  const large = (to - from) * SWEEP_DEG > 180 ? 1 : 0;
  return `M ${f(x0)} ${f(y0)} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${f(x1)} ${f(y1)}`;
}

function glyph({ main = '#FFFFFF', trackOpacity = 0.3, accent = ACCENT }) {
  const needleDeg = degAt(NEEDLE_FRACTION);
  const ux = Math.cos(rad(needleDeg));
  const uy = -Math.sin(rad(needleDeg));
  const tip = [CENTER.x + ux * 228, CENTER.y + uy * 228];
  const tail = [CENTER.x - ux * 34, CENTER.y - uy * 34];
  const left = [CENTER.x - uy * 22, CENTER.y + ux * 22];
  const right = [CENTER.x + uy * 22, CENTER.y - ux * 22];
  const needle = [tip, left, tail, right].map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

  // "KM" drawn with strokes so no font is needed.
  const top = 690;
  const bottom = 792;
  const k = 414;
  const m = k + 72 + 40;
  const letters = [
    `M ${k} ${top} V ${bottom}`,
    `M ${k + 68} ${top} L ${k + 6} ${top + 58}`,
    `M ${k + 28} ${top + 40} L ${k + 72} ${bottom}`,
    `M ${m} ${bottom} V ${top} L ${m + 44} ${top + 60} L ${m + 88} ${top} V ${bottom}`,
  ].join(' ');

  const line = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  return `
    <path d="${arcPath(0, 1)}" ${line} stroke="${main}" stroke-opacity="${trackOpacity}" stroke-width="${STROKE}"/>
    <path d="${arcPath(0, NEEDLE_FRACTION)}" ${line} stroke="${main}" stroke-width="${STROKE}"/>
    <path d="${arcPath(ZONE_FROM, 1)}" ${line} stroke="${accent}" stroke-width="${STROKE}"/>
    <polygon points="${needle}" fill="${main}" stroke="${main}" stroke-width="10" stroke-linejoin="round"/>
    <circle cx="${CENTER.x}" cy="${CENTER.y}" r="50" fill="${main}"/>
    <path d="${letters}" ${line} stroke="${main}" stroke-width="30"/>`;
}

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BG_TOP}"/>
        <stop offset="1" stop-color="${BG_BOTTOM}"/>
      </linearGradient>
    </defs>
    ${body}
  </svg>`;

const scaled = (content, scale) =>
  `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${content}</g>`;
const background = '<rect width="1024" height="1024" fill="url(#bg)"/>';

const SOURCES = {
  // Full square; iOS and the header apply their own rounding.
  full: svg(background + scaled(glyph({}), 0.92)),
  // Legacy Android icons (Android 7): rounded square and circle.
  rounded: svg(`<rect width="1024" height="1024" rx="230" fill="url(#bg)"/>` + scaled(glyph({}), 0.92)),
  round: svg(`<circle cx="512" cy="512" r="512" fill="url(#bg)"/>` + scaled(glyph({}), 0.86)),
  // Adaptive icon layers (Android 8+): the glyph stays inside the central safe zone.
  background: svg(background),
  foreground: svg(scaled(glyph({}), 0.72)),
  monochrome: svg(scaled(glyph({ accent: '#FFFFFF', trackOpacity: 0.4 }), 0.72)),
};

// dp-to-px multipliers of the Android density buckets.
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const ADAPTIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`;

const IOS_CONTENTS = {
  images: [{ filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
  info: { author: 'xcode', version: 1 },
};

async function png(source, size, file, { opaque = false } = {}) {
  let image = sharp(Buffer.from(source)).resize(size, size);
  if (opaque) image = image.flatten({ background: BG_BOTTOM }).removeAlpha();
  await image.png({ compressionLevel: 9 }).toFile(file);
}

(async () => {
  await png(SOURCES.full, 1024, path.join(ROOT, 'assets', 'icon.png'));

  for (const [density, scale] of Object.entries(DENSITIES)) {
    const dir = path.join(ANDROID_RES, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });
    await png(SOURCES.rounded, 48 * scale, path.join(dir, 'ic_launcher.png'));
    await png(SOURCES.round, 48 * scale, path.join(dir, 'ic_launcher_round.png'));
    await png(SOURCES.background, 108 * scale, path.join(dir, 'ic_launcher_background.png'));
    await png(SOURCES.foreground, 108 * scale, path.join(dir, 'ic_launcher_foreground.png'));
    await png(SOURCES.monochrome, 108 * scale, path.join(dir, 'ic_launcher_monochrome.png'));
  }
  const anydpi = path.join(ANDROID_RES, 'mipmap-anydpi-v26');
  fs.mkdirSync(anydpi, { recursive: true });
  fs.writeFileSync(path.join(anydpi, 'ic_launcher.xml'), ADAPTIVE_XML);
  fs.writeFileSync(path.join(anydpi, 'ic_launcher_round.xml'), ADAPTIVE_XML);

  // The App Store icon must not have an alpha channel.
  await png(SOURCES.full, 1024, path.join(IOS_ICONS, 'AppIcon-1024.png'), { opaque: true });
  fs.writeFileSync(path.join(IOS_ICONS, 'Contents.json'), JSON.stringify(IOS_CONTENTS, null, 2) + '\n');

  console.log('icons written');
})();
