import { copyFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const appUrl = process.env.FACTORY_TAKT_URL ?? 'http://127.0.0.1:5174';
const publicDir = 'public/showcase/screenshots';
const docsDir = 'docs/showcase/screenshots';

await Promise.all([mkdir(publicDir, { recursive: true }), mkdir(docsDir, { recursive: true })]);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

await page.addInitScript(() => localStorage.clear());

try {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('button[aria-label="Enter simulator"]').click({ timeout: 5000 });
  await page.waitForFunction(() => Boolean(window.FactoryTaktAgent?.getSnapshot?.()));
  await page.evaluate(() => {
    window.FactoryTaktAgent?.runCommand({
      type: 'updateSettings',
      patch: { language: 'en', animationIntensity: 'standard' },
    });
    window.FactoryTaktAgent?.runCommand({ type: 'reset' });
  });
  await page.locator('.canvas-zoom-slider input').fill('0.34');
  await page.waitForTimeout(500);

  await page.screenshot({ path: `${publicDir}/line-overview.png` });
  await copyFile(`${publicDir}/line-overview.png`, `${docsDir}/01-line-overview.png`);

  await page.evaluate(() => {
    window.FactoryTaktAgent?.runCommand({ type: 'setSpeed', speed: 20 });
    window.FactoryTaktAgent?.runCommand({ type: 'start' });
  });
  await page.waitForTimeout(6500);
  await page.evaluate(() => window.FactoryTaktAgent?.runCommand({ type: 'setSpeed', speed: 2 }));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${publicDir}/running-workbench.png` });
  await copyFile(`${publicDir}/running-workbench.png`, `${docsDir}/04-running-workbench.png`);
  await page.locator('[data-testid="factory-canvas"]').screenshot({ path: `${docsDir}/03-running-flow.png` });

  await page.goto(`${appUrl}/?view=showcase`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const enterButton = page.locator('button[aria-label="Enter simulator"]');
  if (await enterButton.isVisible().catch(() => false)) await enterButton.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${docsDir}/07-product-showcase.png` });
} finally {
  await browser.close();
}

console.log(`Showcase screenshots refreshed from ${appUrl}.`);
