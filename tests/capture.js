const { chromium } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const dir = path.resolve('.impeccable/review'); await fs.mkdir(dir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const results = [];
  for (const [name, route, width, theme] of [
    ['desktop', '/', 1440, 'dark'], ['mobile', '/', 390, 'dark'],
    ['desktop-light', '/', 1440, 'light'], ['mobile-light', '/', 390, 'light'],
    ['catalog', '/productos', 1440, 'dark'], ['catalog-mobile', '/productos', 390, 'dark'],
    ['login', '/login', 1440, 'dark'], ['login-mobile', '/login', 390, 'light'],
    ['user-1919', '/', 1919, 'dark'],
  ]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    await page.goto('http://127.0.0.1:4300');
    await page.evaluate(value => localStorage.setItem('qr-theme', value), theme);
    await page.goto(`http://127.0.0.1:4300${route}`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('h1').waitFor();
    if (route === '/productos') await page.locator('.product-card').first().waitFor();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    results.push({ name, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      violations: audit.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
  }
  await fs.writeFile(path.join(dir, 'accessibility.json'), JSON.stringify({ errors, results }, null, 2));
  console.log(JSON.stringify({ errors, results }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
