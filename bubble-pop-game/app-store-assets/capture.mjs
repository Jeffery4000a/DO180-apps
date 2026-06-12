/**
 * Playwright script — captures iPhone 6.7" screenshots + a promo video.
 *
 * Screenshots: 1290×2796 (iPhone 15 Plus / 14 Plus App Store size)
 *   • The logical CSS viewport is 430×932 (standard iPhone 6.7" points)
 *   • deviceScaleFactor: 3 → 1290×2796 physical pixels
 *
 * Video: rendered at 1080×1920 (9:16 portrait), ~20 seconds.
 *   Playwright's built-in recordVideo captures a .webm file.
 */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = 'file://' + path.join(__dirname, 'game-screens.html');
const OUT  = __dirname;

// iPhone 6.7" — 430 × 932 logical, ×3 for App Store screenshots
const IPHONE_W  = 430;
const IPHONE_H  = 932;
const SCALE     = 3;

// App Store screenshot names (matching screen order in HTML)
const SCREEN_NAMES = [
  '01-home',
  '02-gameplay',
  '03-goldrush',
  '04-gameover',
  '05-leaderboard',
  '06-cardvault',
];

async function captureScreenshots() {
  console.log('📸  Launching browser for screenshots…');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: IPHONE_W, height: IPHONE_H },
    deviceScaleFactor: SCALE,
  });

  await page.goto(HTML, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600); // let CSS animations settle

  for (let i = 0; i < SCREEN_NAMES.length; i++) {
    // Use keyboard shortcut defined in HTML to switch screens
    await page.evaluate(idx => {
      const screens = ['home','game','goldrush','gameover','leaderboard','vault'];
      document.querySelectorAll('.screen').forEach((s,j) => s.classList.toggle('active', j === idx));
    }, i);

    await page.waitForTimeout(i === 0 ? 400 : 300);

    const file = path.join(OUT, `${SCREEN_NAMES[i]}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  ✓  ${SCREEN_NAMES[i]}.png`);
  }

  await browser.close();
  console.log('📸  Screenshots done.\n');
}

async function captureVideo() {
  console.log('🎬  Launching browser for video…');
  const VIDEO_W = 390;
  const VIDEO_H = 844;
  const VIDEO_SCALE = 2; // results in ~780×1688 resolution WebM

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: VIDEO_W, height: VIDEO_H },
    deviceScaleFactor: VIDEO_SCALE,
    recordVideo: {
      dir: OUT,
      size: { width: VIDEO_W * VIDEO_SCALE, height: VIDEO_H * VIDEO_SCALE },
    },
  });
  const page = await ctx.newPage();
  await page.goto(HTML, { waitUntil: 'networkidle' });

  // Helper
  const show = async (idx, hold = 3000) => {
    await page.evaluate(i => {
      document.querySelectorAll('.screen').forEach((s,j) => s.classList.toggle('active', j === i));
    }, idx);
    await page.waitForTimeout(hold);
  };

  const wait = ms => page.waitForTimeout(ms);

  console.log('  Recording…');

  // 0-2s: Home screen
  await show(0, 2500);

  // 2-7s: Gameplay — simulate tile drops via DOM manipulation
  await show(1, 700);
  // Add a drop animation effect
  for (let drop = 0; drop < 4; drop++) {
    await page.evaluate(() => {
      const cells = document.querySelectorAll('#main-grid .cell.empty');
      if (!cells.length) return;
      // highlight a random drop zone
      const cols = [0,1,2,3,4,5];
      const col = cols[Math.floor(Math.random() * cols.length)];
      const colBtns = document.querySelectorAll('.col-btn');
      colBtns.forEach((b,i) => {
        b.style.background = i === col ? 'rgba(124,77,255,0.4)' : '';
        b.style.transform  = i === col ? 'scale(0.9)' : '';
      });
      setTimeout(() => colBtns.forEach(b => { b.style.background = ''; b.style.transform = ''; }), 300);
    });
    await wait(700);
  }
  await wait(500);

  // 7-10.5s: Combo badge highlight
  await page.evaluate(() => {
    const badge = document.querySelector('.combo-pill');
    if (badge) { badge.style.transform = 'scale(1.3)'; badge.style.transition = '0.3s'; }
    setTimeout(() => { if (badge) badge.style.transform = ''; }, 400);
  });
  await wait(400);
  await page.evaluate(() => {
    const text = document.querySelector('.combo-label');
    if (text) text.textContent = '×4 COMBO INCOMING!';
  });
  await wait(700);

  // Meter fills up
  await page.evaluate(() => {
    const fill = document.querySelector('.gold-rush-fill');
    const text = document.querySelector('.gold-rush-text');
    if (fill) { fill.style.transition = '1s'; fill.style.width = '95%'; }
    if (text) text.textContent = '⚡ GOLD RUSH 95%';
  });
  await wait(1200);
  await page.evaluate(() => {
    const fill = document.querySelector('.gold-rush-fill');
    const text = document.querySelector('.gold-rush-text');
    if (fill) fill.style.width = '100%';
    if (text) text.textContent = '⚡ GOLD RUSH — READY!';
  });
  await wait(600);

  // 10.5-14.5s: Gold Rush!
  await show(2, 4000);

  // 14.5-17s: Game Over / rank reveal
  await show(3, 2500);

  // 17-19.5s: Leaderboard
  await show(4, 2500);

  // 19.5-22s: Card Vault
  await show(5, 2500);

  // 22-24s: Back to home (loop-ready)
  await show(0, 2000);

  // Finish recording
  const videoPath = await page.video().path();
  await ctx.close();
  await browser.close();

  // Rename to friendly name
  const dest = path.join(OUT, 'promo-video.webm');
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.renameSync(videoPath, dest);

  console.log(`  ✓  promo-video.webm  (~24s, ${VIDEO_W * VIDEO_SCALE}×${VIDEO_H * VIDEO_SCALE})`);
  console.log('\n🎬  Video done.\n');
  console.log('NOTE: WebM works on Android, Chrome, and most modern players.');
  console.log('      For App Store upload (requires .mov or .mp4), convert with:');
  console.log('      ffmpeg -i promo-video.webm -c:v libx264 -pix_fmt yuv420p promo-video.mp4\n');
}

(async () => {
  await captureScreenshots();
  await captureVideo();
  console.log('✅  All assets saved to app-store-assets/');
})();
