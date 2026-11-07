// Chụp trang chủ / danh sách / tìm kiếm của clone (offline, stub API bằng fixture đã capture).
// Dùng: PLAYWRIGHT_PKG=<path playwright> node qa/shot-lists.mjs http://127.0.0.1:4173 qa/shots
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PKG || 'playwright');

const [base = 'http://127.0.0.1:4173', out = 'qa/shots'] = process.argv.slice(2);
const fixtures = path.resolve('docs/research/nguonc');
fs.mkdirSync(out, { recursive: true });

const FIX = [
    [/\/api\/films\/phim-moi-cap-nhat/, 'api-films-phim-moi-cap-nhat-p1.json'],
    [/\/api\/films\/danh-sach\/phim-bo/, 'api-films-danh-sach-phim-bo-p2.json'],
    [/\/api\/films\/the-loai\/hinh-su/, 'api-films-the-loai-hinh-su-p1.json'],
    [/\/api\/films\/search/, 'api-films-search-bac-si.json'],
    [/\/api\/film\/bac-si-x$/, 'api-film-bac-si-x.json'],
];

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2600 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', colorScheme: 'dark', reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, async (route) => {
    const url = route.request().url();
    const hit = FIX.find(([re]) => re.test(url));
    if (hit) return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, path: path.join(fixtures, hit[1]) });
    if (/img\.nguonc\.com/.test(url)) return route.fulfill({ contentType: 'image/webp', path: path.join(fixtures, 'poster-thumb.webp') });
    return route.abort();
});

const shots = [
    ['home', '/'],
    ['list-phim-bo', '/danh-sach/phim-bo?page=2'],
    ['list-hinh-su', '/the-loai/hinh-su'],
    ['search', '/tim-kiem?keyword=bac%20si'],
];
for (const [name, url] of shots) {
    await page.goto(base + url, { waitUntil: 'load' });
    await page.waitForSelector('.nc-movie-table tbody tr');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `${name}-1440.png`) });
    const info = await page.evaluate(() => ({
        title: document.title,
        rows: document.querySelectorAll('.nc-movie-table tbody tr').length,
        pager: Array.from(document.querySelectorAll('.nc-page-control > *')).map((n) => n.textContent.trim()).join(' '),
        h1: document.querySelector('h1')?.textContent.trim(),
        count: document.querySelector('.nc-result-count')?.textContent.trim(),
        heroTop: document.querySelector('.nc-home-hero, .nc-page-heading')?.getBoundingClientRect().top,
        tableTop: document.querySelector('.nc-movie-table')?.getBoundingClientRect().top,
        rowH: document.querySelector('.nc-movie-table tbody tr')?.getBoundingClientRect().height,
    }));
    console.log(name, JSON.stringify(info));
}
// grid view + filter submit + link to film page
await page.click('.nc-view-switch [data-nc-view-choice="grid"]');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, 'search-grid-1440.png') });
console.log('grid attr', await page.evaluate(() => document.documentElement.getAttribute('data-nc-movie-view')));
await page.click('.nc-view-switch [data-nc-view-choice="list"]');
await page.selectOption('select[name="genre"]', '/the-loai/hinh-su');
await page.click('#btn-movie-filter');
await page.waitForSelector('h1:has-text("Hình sự")');
console.log('filter →', page.url());
await page.click('.nc-movie-table tbody tr:first-child .nc-movie-identity');
await page.waitForSelector('.nc-film-hero');
console.log('row click →', page.url(), await page.title());
if (errors.length) console.log('ERRORS', errors);
await browser.close();
