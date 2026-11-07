// Chụp trang clone để so với ảnh REA của bản gốc.
// Offline: chặn mạng ngoài, trả JSON/ảnh đã capture cho API + poster.
// Dùng: node qa/shot.mjs <baseUrl> <outDir> [--open-player] [--open-sources] [--width 1440] [--height 2600]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PKG || 'playwright');
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const base = args[0] ?? 'http://127.0.0.1:4173';
const out = args[1] ?? 'qa/shots';
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const width = Number(opt('--width', 1440));
const height = Number(opt('--height', 2600));
const fixtures = path.resolve('docs/research/nguonc');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', colorScheme: 'dark', reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, async (route) => {
    const url = route.request().url();
    if (/\/api\/film\/bac-si-x$/.test(url)) return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, path: path.join(fixtures, 'api-film-bac-si-x.json') });
    if (/img\.nguonc\.com\/images\/img-bdda/.test(url)) return route.fulfill({ contentType: 'image/webp', path: path.join(fixtures, 'poster-thumb.webp') });
    if (/streamc\.xyz/.test(url)) return route.fulfill({ contentType: 'text/html', body: '<html style="background:#dedede"></html>' });
    return route.abort();
});

const target = `${base}/phim/bac-si-x`;
await page.goto(target, { waitUntil: 'load' });
await page.waitForSelector('.nc-film-hero');
await page.waitForTimeout(400);
let name = 'film';
if (flag('--open-player')) { await page.click('#nc-watch-now'); await page.waitForTimeout(800); name += '-player'; }
if (flag('--open-sources')) { await page.click('#data_link > summary'); await page.waitForTimeout(400); name += '-sources'; }
await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: false });

const metrics = await page.evaluate(() => {
    const r = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
    return {
        header: r('.nc-site-header'), brand: r('.nc-brand'), search: r('.nc-search-input'), nav: r('.nc-primary-nav__list'),
        breadcrumb: r('.nc-breadcrumb'), hero: r('.nc-film-hero'), poster: r('.nc-film-poster'), h1: r('#nc-film-title'),
        actions: r('.nc-film-actions'), facts: r('.nc-film-facts'), sources: r('#data_link'), player: r('#nc-film-player'),
        stage: r('.nc-player-stage'), episodes: r('.nc-player-episodes__grid'), footer: r('.nc-site-footer'),
        title: document.title, episodeButtons: document.querySelectorAll('.nc-player-episode').length,
        currentLabel: document.querySelector('#nc-player-current')?.textContent, embedLines: (document.querySelector('#area_embed')?.value || '').split('\n').filter(Boolean).length,
    };
});
console.log(JSON.stringify(metrics, null, 1));
if (errors.length) { console.log('ERRORS:', errors); }
await browser.close();
