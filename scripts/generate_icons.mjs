#!/usr/bin/env node
// Regenerates the app's whole icon set from one master source image
// (assets/main-icon.jpg) -- that's the only file to replace when the icon
// changes; everything else here is derived. Produces:
//
//   assets/icon.png             -- square 1024x1024 master, letterboxed
//                                   onto a white background. This is the
//                                   source @capacitor/assets reads for
//                                   Android's launcher icon (`--android` in
//                                   scripts/build_apk.sh/.ps1) -- it CROPS a
//                                   non-square source to a square rather
//                                   than padding it, which would slice into
//                                   main-icon.jpg's lettering (it runs
//                                   edge-to-edge in the original 588x340
//                                   banner). Pre-squaring here avoids that.
//   public/icons/icon-*.png     -- PWA manifest icons (vite.config.ts).
//   public/icons/maskable-*.png -- same, shrunk into the ~80% "safe zone"
//                                   maskable icons need -- Android/adaptive
//                                   icon masks (circle, squircle, ...) crop
//                                   right up to the canvas edge, so content
//                                   flush with the edge gets clipped.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = path.join(repoRoot, 'assets', 'main-icon.jpg');
const MASTER = path.join(repoRoot, 'assets', 'icon.png');
const ICONS_DIR = path.join(repoRoot, 'public', 'icons');
const BACKGROUND = '#ffffff';
const MASTER_SIZE = 1024;
const MASKABLE_SAFE_ZONE = 0.8;

function relative(p) {
  return path.relative(repoRoot, p).replace(/\\/g, '/');
}

async function buildMaster() {
  await sharp(SOURCE)
    .resize(MASTER_SIZE, MASTER_SIZE, { fit: 'contain', background: BACKGROUND })
    .png()
    .toFile(MASTER);
  console.log(`wrote ${relative(MASTER)}`);
}

async function plainIcon(size) {
  const out = path.join(ICONS_DIR, `icon-${size}.png`);
  await sharp(MASTER).resize(size, size).png().toFile(out);
  console.log(`wrote ${relative(out)}`);
}

async function maskableIcon(size) {
  const out = path.join(ICONS_DIR, `maskable-${size}.png`);
  const inner = Math.round(size * MASKABLE_SAFE_ZONE);
  const iconBuffer = await sharp(MASTER).resize(inner, inner).toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: iconBuffer, gravity: 'center' }])
    .png()
    .toFile(out);
  console.log(`wrote ${relative(out)}`);
}

await mkdir(ICONS_DIR, { recursive: true });
await buildMaster();
await Promise.all([plainIcon(192), plainIcon(512), maskableIcon(192), maskableIcon(512)]);
