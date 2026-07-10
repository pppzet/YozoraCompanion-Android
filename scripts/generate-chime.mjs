/**
 * タイマー終了チャイムのWAVを合成する。
 * Web版のWebAudio実装（880Hz→1046.5Hzのサイン波2音、指数エンベロープ）の移植。
 * 使い方: node scripts/generate-chime.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44100;
const DURATION = 1.3; // 秒
const NOTES = [
  { delay: 0, freq: 880 },
  { delay: 0.28, freq: 1046.5 },
];
const NOTE_LENGTH = 0.95;
const ATTACK = 0.03;
const PEAK = 0.16;
const FLOOR = 0.0001;

const total = Math.round(SAMPLE_RATE * DURATION);
const samples = new Float64Array(total);

for (const { delay, freq } of NOTES) {
  const start = Math.round(delay * SAMPLE_RATE);
  const length = Math.round(NOTE_LENGTH * SAMPLE_RATE);
  const attackSamples = Math.round(ATTACK * SAMPLE_RATE);
  for (let i = 0; i < length && start + i < total; i++) {
    const t = i / SAMPLE_RATE;
    // exponentialRampToValueAtTime相当のエンベロープ
    let gain;
    if (i < attackSamples) {
      gain = FLOOR * Math.pow(PEAK / FLOOR, i / attackSamples);
    } else {
      const decayPos = (i - attackSamples) / (length - attackSamples);
      gain = PEAK * Math.pow(FLOOR / PEAK, decayPos);
    }
    samples[start + i] += Math.sin(2 * Math.PI * freq * t) * gain;
  }
}

// 16bit PCM モノラルWAVへ
const pcm = Buffer.alloc(total * 2);
for (let i = 0; i < total; i++) {
  const v = Math.max(-1, Math.min(1, samples[i]));
  pcm.writeInt16LE(Math.round(v * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16); // fmtチャンクサイズ
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // モノラル
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28); // バイトレート
header.writeUInt16LE(2, 32); // ブロックアライン
header.writeUInt16LE(16, 34); // ビット深度
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "audio");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "chime.wav");
writeFileSync(outPath, Buffer.concat([header, pcm]));
console.log(`wrote ${outPath} (${((header.length + pcm.length) / 1024).toFixed(1)} KiB)`);
