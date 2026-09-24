// Browser smoke test for the main public and organiser journeys.
// Local-only and read-only: it never publishes, edits or deletes league data.
//
//   node tests/e2e-smoke.mjs --key-file <private local key file> [--shots <dir>]
//
// Uses an existing Playwright install (project or global) instead of adding a
// dependency. Set RLS_TEST_BASE to http://localhost:3000|3001|3002|3003.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  try {
    playwright = require(`${execSync('npm root -g').toString().trim()}/playwright`);
  } catch {
    console.log('SKIP: Playwright is not installed; browser smoke test not run.');
    process.exit(0);
  }
}
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const base = process.env.RLS_TEST_BASE || 'http://localhost:3000';
assert(/^http:\/\/localhost:300[0-3]$/.test(base), 'Smoke tests only run against localhost.');
const keyFile = arg('--key-file');
assert(keyFile, 'Pass --key-file with the local organiser key.');
const key = fs.readFileSync(keyFile, 'utf8').trim();
const shots = arg('--shots');
if (shots) fs.mkdirSync(shots, { recursive: true });

const browser = await playwright.chromium.launch();
const failures = [];
async function page(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && p.errors.push(m.text()));
  return p;
}
async function check(p, label, path, expect) {
  await p.goto(base + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const text = await p.textContent('body');
  const problems = [
    overflow > 0 && `horizontal overflow ${overflow}px`,
    !expect.test(text) && `missing ${expect}`,
    p.errors.length && `console: ${p.errors.slice(0, 2).join(' | ').slice(0, 200)}`,
  ].filter(Boolean);
  if (problems.length) failures.push(`${label}: ${problems.join('; ')}`);
  if (shots) await p.screenshot({ path: `${shots}/${label.replace(/\W+/g, '-')}.png`, fullPage: true });
  p.errors.length = 0;
}

const publicPages = [
  ['home', '/', /Drivers’ championship/],
  ['round', '/rounds/1', /Australia/],
  ['qualifying', '/rounds/1#qualifying', /Qualifying classification/],
  ['duel', '/rounds/1#duel', /Duel bracket/],
  ['race', '/rounds/1#race', /Official classification/],
  ['championship', '/championship', /Championship standings/],
  ['calendar', '/calendar', /calendar/],
  ['drivers', '/drivers', /Driver profiles/],
  ['noticeboard', '/noticeboard', /Noticeboard/],
];
for (const width of [375, 768, 1440]) {
  const p = await page(width);
  for (const [label, path, expect] of publicPages) await check(p, `${label}@${width}`, path, expect);
  await p.context().close();
}

// Legacy shared links still open the right round, on its canonical URL.
{
  const p = await page(1280);
  await p.goto(`${base}/#round-3`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  assert.equal(new URL(p.url()).pathname, '/rounds/3', 'legacy #round-3 redirects');
  assert.match(await p.textContent('h1'), /Japan/);
  // Client-side navigation keeps history usable.
  await p.click('nav[aria-label="League"] a[href="/championship"]');
  await p.waitForURL('**/championship');
  await p.goBack();
  await p.waitForURL('**/rounds/3');
  await p.context().close();
}

// Organiser journey: login (submitted immediately, before hydration can be
// assumed), dashboard, Media Centre preview, logout. Read-only.
{
  const p = await page(1280);
  const urls = [];
  p.on('request', (r) => urls.push(r.url()));
  await p.goto(`${base}/admin`);
  await p.fill('#organiser-key', key);
  await p.click('form button.primary');
  await p.waitForSelector('.admin-shell');
  assert(!urls.some((u) => u.includes(encodeURIComponent(key)) || u.includes(key)), 'key never appears in a URL');
  await check(p, 'admin-dashboard', '/admin', /Publication status/);
  await check(p, 'admin-media', '/admin/media?round=1', /graphics ready|of 6 ready/);
  await p.getByRole('button', { name: 'Preview all' }).click();
  await p.waitForFunction(() => /graphics? ready/.test(document.querySelector('.media-status')?.textContent || ''), null, { timeout: 30000 });
  const sizes = await p.$$eval('.media-thumb img', (imgs) => imgs.map((i) => i.naturalWidth));
  assert(sizes.length >= 4 && sizes.every((w) => w === 1200 || w === 1500), `PNG widths ${sizes}`);
  await p.goto(`${base}/admin`);
  await p.getByRole('button', { name: /Log out/ }).click();
  await p.waitForSelector('#organiser-key');
  await p.context().close();
}

await browser.close();
if (failures.length) {
  console.error(`FAIL:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('PASS: public pages at 375/768/1440 (no overflow or console errors), legacy round links and history, organiser login without key-in-URL, dashboard, Media Centre PNG rendering and logout.');
