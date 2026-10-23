// Neemt de safaririt uit de homepage-kop op als mp4: beeld voor beeld, door de animaties exact
// door te spoelen (vloeiend, onafhankelijk van de snelheid van de computer).
//
// Gebruik (dev-server moet draaien op :3000):
//   node scripts/record-hero.mjs <uitvoer.mp4> [seconden=75] [fps=30] [breedte=1920] [hoogte=1080] [framemap]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import ffmpeg from 'ffmpeg-static';

const [out = 'safari-rit.mp4', secs = '75', fps = '30', width = '1920', height = '1080', framesArg] = process.argv.slice(2);
const SECONDS = Number(secs);
const FPS = Number(fps);
const W = Number(width);
const H = Number(height);
const frames = framesArg || fs.mkdtempSync(path.join(os.tmpdir(), 'kt-frames-'));
fs.mkdirSync(frames, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto('http://localhost:3000/nl', { waitUntil: 'networkidle0', timeout: 120000 });

// Alleen de scène: menu, tekst, knoppen, labels en het Next.js-ontwikkelicoon verbergen.
await page.addStyleTag({
  content: `
    header, nextjs-portal, .kt-biome-label { display: none !important; }
    main > section:first-of-type { margin-top: 0 !important; height: 100vh !important; min-height: 0 !important; }
    main > section:first-of-type > :not(svg) { display: none !important; }
    html, body { overflow: hidden !important; }
    /* iets inzoomen op het landschap: de lucht bovenin was bedoeld als ruimte voor tekst */
    main > section:first-of-type > svg { top: auto !important; bottom: 0 !important; height: 130vh !important; }
  `,
});
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 1500));

const total = Math.round(SECONDS * FPS);
console.log(`Opnemen: ${total} beelden (${SECONDS}s @ ${FPS}fps, ${W}x${H}) naar ${frames}`);
for (let i = 0; i < total; i++) {
  const t = i / FPS;
  await page.evaluate((sec) => {
    // CSS-animaties (wereld, gras, dieren) exact op tijdstip zetten
    for (const a of document.getAnimations()) {
      // scroll-gekoppelde animaties (buiten de kopsectie) overslaan
      if (!(a.timeline instanceof DocumentTimeline)) continue;
      a.pause();
      a.currentTime = sec * 1000;
    }
    // SMIL-animaties in de SVG (wielen, stof)
    const svg = document.querySelector('main > section:first-of-type > svg');
    if (svg && svg.pauseAnimations) {
      svg.pauseAnimations();
      svg.setCurrentTime(sec);
    }
  }, t);
  await page.screenshot({ path: path.join(frames, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  if (i % 150 === 0) console.log(`  beeld ${i}/${total}`);
}
await browser.close();

console.log('Samenvoegen tot mp4…');
execFileSync(ffmpeg, [
  '-y', '-framerate', String(FPS), '-i', path.join(frames, '%05d.jpg'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out,
], { stdio: 'inherit' });
console.log(`Klaar: ${out}`);
