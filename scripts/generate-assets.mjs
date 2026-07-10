/**
 * アプリアイコン・スプラッシュ・通知アイコンをSVGから描き出す。
 * 使い方: node scripts/generate-assets.mjs（sharpが必要: npm i -D sharp）
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "assets");
mkdirSync(ASSETS, { recursive: true });

const NIGHT_DEEP = "#141029";
const NIGHT_MID = "#1f1a3d";
const TEAL = "#6ee7c9";
const VIOLET = "#a78bfa";
const PINK = "#e893c2";
const CREAM = "#f5efe3";
const SHADOW = "#8073a0";

/** ルナ（うさぎ）のシルエット一式。Web版のSVGパスを縮約したもの。 */
function bunny(scale, tx, ty, withFace = true) {
  return `
  <g transform="translate(${tx},${ty}) scale(${scale})">
    <ellipse cx="100" cy="207" rx="46" ry="8" fill="${SHADOW}" opacity="0.25"/>
    <path d="M85,78 C78,50 76,20 88,8 C96,10 98,20 96,45 C94,60 92,72 92,80 Z" fill="${CREAM}" stroke="${SHADOW}" stroke-width="2"/>
    <path d="M87,70 C83,48 82,26 89,15 C93,25 93,45 91,68 Z" fill="${PINK}" opacity="0.32"/>
    <path d="M112,80 C112,60 110,35 116,15 C124,10 132,18 130,32 C128,44 120,50 122,62 C124,70 118,78 108,80 Z" fill="${CREAM}" stroke="${SHADOW}" stroke-width="2"/>
    <path d="M116,70 C115,52 116,32 120,20 C126,24 127,36 123,50 C121,58 118,64 118,70 Z" fill="${PINK}" opacity="0.32"/>
    <circle cx="100" cy="110" r="36" fill="${CREAM}" stroke="${SHADOW}" stroke-width="2"/>
    <ellipse cx="100" cy="164" rx="44" ry="38" fill="${CREAM}" stroke="${SHADOW}" stroke-width="2"/>
    <ellipse cx="80" cy="120" rx="6" ry="4" fill="${PINK}" opacity="0.45"/>
    <ellipse cx="120" cy="120" rx="6" ry="4" fill="${PINK}" opacity="0.45"/>
    ${
      withFace
        ? `<path d="M83,109 Q88,103 93,109" stroke="${NIGHT_DEEP}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M107,109 Q112,103 117,109" stroke="${NIGHT_DEEP}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M91,118 Q100,128 109,118" stroke="${NIGHT_DEEP}" stroke-width="2" fill="none" stroke-linecap="round"/>`
        : ""
    }
  </g>`;
}

function star(x, y, r, opacity) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${CREAM}" opacity="${opacity}"/>`;
}

const STARS = [
  [140, 180, 7, 0.9],
  [300, 120, 4, 0.6],
  [830, 210, 6, 0.8],
  [900, 420, 4, 0.5],
  [180, 520, 4, 0.55],
  [700, 130, 3, 0.5],
  [250, 320, 3, 0.45],
  [780, 560, 5, 0.6],
  [520, 110, 3, 0.5],
  [110, 760, 4, 0.4],
  [880, 740, 4, 0.45],
]
  .map(([x, y, r, o]) => star(x, y, r, o))
  .join("\n");

/** 三日月（クレセント）。二円の差分。 */
function moon(cx, cy, r) {
  return `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r * 1.25}" fill="${CREAM}" opacity="0.08"/>
    <mask id="crescent">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>
      <circle cx="${cx + r * 0.42}" cy="${cy - r * 0.28}" r="${r * 0.86}" fill="black"/>
    </mask>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${CREAM}" mask="url(#crescent)"/>
  </g>`;
}

// ---- アプリアイコン（1024x1024・角丸はランチャー側で切り抜かれる想定で全面塗り） ----
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="sky" cx="50%" cy="24%" r="95%">
      <stop offset="0%" stop-color="${NIGHT_MID}"/>
      <stop offset="100%" stop-color="${NIGHT_DEEP}"/>
    </radialGradient>
    <radialGradient id="aurora1" cx="20%" cy="22%" r="55%">
      <stop offset="0%" stop-color="${TEAL}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${TEAL}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aurora2" cx="82%" cy="30%" r="55%">
      <stop offset="0%" stop-color="${VIOLET}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${VIOLET}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aurora3" cx="50%" cy="92%" r="60%">
      <stop offset="0%" stop-color="${PINK}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${PINK}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#sky)"/>
  <rect width="1024" height="1024" fill="url(#aurora1)"/>
  <rect width="1024" height="1024" fill="url(#aurora2)"/>
  <rect width="1024" height="1024" fill="url(#aurora3)"/>
  ${STARS}
  ${moon(710, 280, 150)}
  ${bunny(2.6, 252, 190)}
</svg>`;

// ---- アダプティブアイコン前景（中央66%がセーフゾーン） ----
const adaptiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="glow" cx="50%" cy="45%" r="40%">
      <stop offset="0%" stop-color="${VIOLET}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${VIOLET}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  ${moon(660, 340, 96)}
  ${bunny(1.9, 322, 300)}
</svg>`;

// ---- スプラッシュアイコン（透過・中央ロゴ） ----
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${moon(680, 300, 120)}
  ${bunny(2.2, 292, 240)}
</svg>`;

// ---- 通知アイコン（白モノクロ・透過） ----
const notificationSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <mask id="c2">
    <circle cx="48" cy="48" r="34" fill="white"/>
    <circle cx="62" cy="38" r="30" fill="black"/>
  </mask>
  <circle cx="48" cy="48" r="34" fill="white" mask="url(#c2)"/>
  <circle cx="66" cy="64" r="5" fill="white"/>
  <circle cx="30" cy="20" r="4" fill="white"/>
</svg>`;

async function render(svg, name, size) {
  const out = join(ASSETS, name);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`wrote assets/${name}`);
}

await render(iconSvg, "icon.png", 1024);
await render(adaptiveSvg, "adaptive-icon.png", 1024);
await render(splashSvg, "splash-icon.png", 1024);
await render(notificationSvg, "notification-icon.png", 96);

// favicon.png はWeb未対応のため生成しない（app.jsonでも未参照）
writeFileSync(join(ASSETS, ".generated"), "scripts/generate-assets.mjs で生成\n");
