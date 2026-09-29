// Draws the app icons (a speedometer gauge with "KM") and writes them to assets/.
// Usage: npm install --no-save sharp && node scripts/generate-icons.js
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'assets');

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

const svg = (body, size = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BG_TOP}"/>
        <stop offset="1" stop-color="${BG_BOTTOM}"/>
      </linearGradient>
    </defs>
    ${body}
  </svg>`;

const scaled = (content, scale) => `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${content}</g>`;
const background = '<rect width="1024" height="1024" fill="url(#bg)"/>';

const files = {
  // iOS / legacy Android icon: a full square, the OS applies the mask.
  'icon.png': { svg: svg(background + scaled(glyph({}), 0.92)), size: 1024 },
  // Android adaptive icon layers: the glyph stays inside the central safe zone.
  'android-icon-background.png': { svg: svg(background), size: 1024 },
  'android-icon-foreground.png': { svg: svg(scaled(glyph({}), 0.72)), size: 1024 },
  'android-icon-monochrome.png': { svg: svg(scaled(glyph({ accent: '#FFFFFF', trackOpacity: 0.4 }), 0.72)), size: 1024 },
  // Splash screen: the glyph only, shown on the splash background color.
  'splash-icon.png': { svg: svg(scaled(glyph({}), 1)), size: 1024 },
  // Web favicon with rounded corners.
  'favicon.png': {
    svg: svg(`<rect width="1024" height="1024" rx="230" fill="url(#bg)"/>` + scaled(glyph({}), 0.92), 256),
    size: 256,
  },
};

(async () => {
  for (const [name, { svg: source, size }] of Object.entries(files)) {
    await sharp(Buffer.from(source)).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(OUT, name));
    console.log('wrote assets/' + name);
  }
})();
