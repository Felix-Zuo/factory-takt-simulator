import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const appUrl = process.env.FACTORY_TAKT_URL ?? 'http://127.0.0.1:5174';
const out = process.env.FACTORY_TAKT_QA_DIR ?? 'reports/screenshots/smoke';
const viewport = {
  width: Number(process.env.FACTORY_TAKT_QA_WIDTH ?? 1920),
  height: Number(process.env.FACTORY_TAKT_QA_HEIGHT ?? 1080),
};

await fs.mkdir(out, { recursive: true });

const results = [];
const consoleMessages = [];
const pass = (name, detail = '') => results.push({ name, ok: true, detail });
const fail = (name, detail = '') => results.push({ name, ok: false, detail });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport,
  deviceScaleFactor: 1,
  acceptDownloads: true,
});

page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) consoleMessages.push(`${msg.type()}: ${msg.text()}`);
});
page.on('pageerror', (error) => consoleMessages.push(`pageerror: ${error.message}`));

await page.addInitScript(() => {
  localStorage.clear();
  localStorage.setItem(
    'factory-takt-simulator:settings:v2',
    JSON.stringify({
      language: 'en',
      themeMode: 'dark',
      animationIntensity: 'showcase',
      cardDensity: 'compact',
      snapToGrid: true,
      hideText: false,
      simulationTargetMode: 'time',
      simulationTargetHours: 8,
      simulationTargetOutput: 10000,
      backgroundStepSec: 1,
    }),
  );
});

try {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const introText = (await page.locator('body').textContent()) ?? '';
  /Factory_Takt_Simulator/.test(introText) && /Line Takt Simulation|Factory Takt Simulator/.test(introText)
    ? pass('intro uses generic Factory Takt branding')
    : fail('intro uses generic Factory Takt branding', 'generic brand text missing');
  await page.screenshot({ path: `${out}/01-intro.png` });

  await page.locator('button[aria-label="Enter simulator"]').click({ timeout: 5000 });
  await page.waitForTimeout(600);

  const asideButtons = await page.locator('aside button').evaluateAll((buttons) => buttons.map((button) => button.textContent?.trim() ?? ''));
  asideButtons.some((text) => text === 'Assembly' || text === '装配')
    ? pass('left module library exposes Assembly tab')
    : fail('left module library exposes Assembly tab', asideButtons.join(' | '));
  await page.locator('aside button').filter({ hasText: /Assembly|装配/ }).first().click({ timeout: 5000 });
  await page.waitForTimeout(250);
  (await page.locator('[data-device-type="assembly_storage"]').isVisible().catch(() => false))
    ? pass('Assembly tab shows assembly process cards')
    : fail('Assembly tab shows assembly process cards');
  await page.screenshot({ path: `${out}/02-assembly-tab.png` });

  await page.getByRole('button', { name: /Settings|设置/ }).click({ timeout: 5000 });
  await page.getByRole('button', { name: /Showcase|展示/ }).click({ timeout: 5000 });
  await page.locator('header button').nth(0).click({ timeout: 5000 });
  await page.waitForTimeout(200);
  const shellClass = (await page.locator('.app-shell').getAttribute('class')) ?? '';
  shellClass.includes('anim-showcase') && !shellClass.includes('view-isometric')
    ? pass('showcase animation is active without removed angled view', shellClass)
    : fail('showcase animation is active without removed angled view', shellClass);
  const rendererTransform = await page
    .locator('.factory-flow .react-flow__renderer')
    .evaluate((node) => getComputedStyle(node).transform)
    .catch(() => '');
  rendererTransform
    ? pass('top-down React Flow renderer is present', rendererTransform)
    : fail('top-down React Flow renderer is present', 'missing renderer');

  await page.getByRole('button', { name: /More|更多/ }).click({ timeout: 5000 });
  await page.getByText(/Generic line demo|通用离散产线示例/).click({ timeout: 5000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/03-bearing-to-assembly.png` });

  const scenarioChecks = await page.evaluate(() => {
    const rawValues = Object.values(localStorage).join('\n');
    return {
      hasAsmStore: rawValues.includes('bearing-asm-store'),
      hasAsmPack: rawValues.includes('bearing-asm-pack'),
      hasMainLineOr: rawValues.includes('OR main line -> ASM'),
      hasMainLineIr: rawValues.includes('IR main line -> ASM'),
      hasTravel40: rawValues.includes('"travelTimeSec":40'),
      hasDispatch3: rawValues.includes('"dispatchIntervalSec":3'),
      visibleNodes: document.querySelectorAll('.react-flow__node').length,
      visibleEdges: document.querySelectorAll('.react-flow__edge').length,
    };
  });
  scenarioChecks.hasAsmStore &&
  scenarioChecks.hasAsmPack &&
  scenarioChecks.hasMainLineOr &&
  scenarioChecks.hasMainLineIr &&
  scenarioChecks.hasTravel40 &&
  scenarioChecks.hasDispatch3
    ? pass('bearing demo is connected into assembly with 3s dispatch and 40s travel', JSON.stringify(scenarioChecks))
    : fail('bearing demo is connected into assembly with 3s dispatch and 40s travel', JSON.stringify(scenarioChecks));

  const canvasBox = await page.locator('[data-testid="factory-canvas"]').boundingBox();
  canvasBox && canvasBox.width > 700 && canvasBox.height > 420
    ? pass('canvas keeps usable working area', `${Math.round(canvasBox.width)}x${Math.round(canvasBox.height)}`)
    : fail('canvas keeps usable working area', canvasBox ? `${Math.round(canvasBox.width)}x${Math.round(canvasBox.height)}` : 'missing');
  const invalidEdgePaths = await page.locator('.flow-main-edge').evaluateAll((paths) =>
    paths.filter((path) => {
      const d = path.getAttribute('d') ?? '';
      const box = path.getBoundingClientRect();
      return !d || d.includes('NaN') || d.includes('undefined') || !Number.isFinite(box.width) || !Number.isFinite(box.height);
    }).length,
  );
  invalidEdgePaths === 0
    ? pass('edge paths stay valid in top-down mode')
    : fail('edge paths stay valid in top-down mode', `${invalidEdgePaths} invalid paths`);
  (await page.locator('.isometric-floor-grid').count()) === 0
    ? pass('removed angled floor grid is not rendered')
    : fail('removed angled floor grid is not rendered');

  const clippedNodes = await page.locator('.react-flow__node').evaluateAll((nodeEls) =>
    nodeEls.filter((node) => {
      const body = node.querySelector('.node-card-body');
      if (!(body instanceof HTMLElement)) return false;
      return body.scrollWidth > body.clientWidth + 1 || body.scrollHeight > body.clientHeight + 1;
    }).length,
  );
  clippedNodes === 0 ? pass('visible node cards have no internal clipping') : fail('visible node cards have no internal clipping', `${clippedNodes}`);

  const feederInputPorts = await page.locator('[data-node-short-name="FEED"] .node-port-label-in').count();
  feederInputPorts >= 1
    ? pass('storage feeder exposes an input port', `${feederInputPorts} input ports`)
    : fail('storage feeder exposes an input port', `${feederInputPorts} input ports`);

  const edgeCountBeforeClickConnect = await page.locator('.react-flow__edge').count();
  await page.locator('[data-node-short-name="FEED"] .node-port-label-out').nth(1).click({ force: true, timeout: 5000 });
  await page.locator('.node-port-label-in').nth(1).click({ force: true, timeout: 5000 });
  await page.waitForTimeout(350);
  const edgeCountAfterClickConnect = await page.locator('.react-flow__edge').count();
  edgeCountAfterClickConnect > edgeCountBeforeClickConnect
    ? pass('click connection works from feeder output to gauge input', `${edgeCountBeforeClickConnect} -> ${edgeCountAfterClickConnect}`)
    : fail('click connection works from feeder output to gauge input', `${edgeCountBeforeClickConnect} -> ${edgeCountAfterClickConnect}`);

  await page.locator('.node-port-label-out').first().click({ force: true, timeout: 5000 });
  (await page.locator('[data-testid="port-rule-editor"]').isVisible().catch(() => false))
    ? pass('clicking an output port opens port rule editor')
    : fail('clicking an output port opens port rule editor');

  await page.locator('.edge-label').first().click({ timeout: 5000 });
  await page.waitForTimeout(150);
  const activeEdgeLabels = await page.locator('.edge-label').evaluateAll((labels) =>
    labels.filter((label) => (label.textContent ?? '').includes('/h')).length,
  );
  activeEdgeLabels === 1 ? pass('selecting an edge expands only one edge label') : fail('selecting an edge expands only one edge label', `${activeEdgeLabels}`);

  await page.getByRole('button', { name: /Start|开始/ }).click({ timeout: 5000 });
  await page.waitForTimeout(5500);
  await page
    .waitForFunction(() => document.querySelectorAll('.material-flow-dot').length > 0, null, { timeout: 2500 })
    .catch(() => undefined);
  const motionCount = await page.locator('.material-flow-dot').count();
  motionCount > 0
    ? pass('line motion renders real material dots', `movers=${motionCount}`)
    : fail('line motion renders real material dots', `movers=${motionCount}`);
  const groupedArmVisuals = await page.locator('.arm-carrier-dot-grouped').evaluateAll((nodes) =>
    nodes.map((node) => ({
      offsetPath: node instanceof HTMLElement ? (getComputedStyle(node).offsetPath || node.style.offsetPath) : '',
      transform: node instanceof HTMLElement ? node.style.transform : '',
    })),
  );
  groupedArmVisuals.length > 0 &&
  groupedArmVisuals.every((item) => item.offsetPath.includes('path(') && !item.transform.includes('translate'))
    ? pass('grouped loader arm stays bound to rail path', `${groupedArmVisuals.length} arm carriers`)
    : fail('grouped loader arm stays bound to rail path', JSON.stringify(groupedArmVisuals));
  const readDotOffsets = () =>
    page.locator('.material-flow-dot').evaluateAll((dots) =>
      dots.map((node) => ({
        id: node instanceof HTMLElement ? (node.dataset.packetId ?? '') : '',
        offset: node instanceof HTMLElement ? node.style.offsetDistance : '',
      })),
    );
  const dotOffsetsBefore = await readDotOffsets();
  await page.waitForTimeout(300);
  const dotOffsetsAfter = await readDotOffsets();
  const beforeById = new Map(dotOffsetsBefore.map((dot) => [dot.id, dot.offset]));
  const movedDots = dotOffsetsAfter.filter((dot) => dot.id && beforeById.has(dot.id) && beforeById.get(dot.id) !== dot.offset).length;
  movedDots > 0
    ? pass('material dots advance smoothly on active conveyors', `${movedDots}/${dotOffsetsAfter.length} moved`)
    : fail(
        'material dots advance smoothly on active conveyors',
        `${dotOffsetsBefore.map((dot) => `${dot.id}:${dot.offset}`).join(',')} -> ${dotOffsetsAfter.map((dot) => `${dot.id}:${dot.offset}`).join(',')}`,
      );
  await page.screenshot({ path: `${out}/04-showcase-running.png` });

  await page.mouse.click((canvasBox?.x ?? 300) + 220, (canvasBox?.y ?? 90) + 160, { button: 'right' });
  await page.waitForTimeout(200);
  (await page.locator('.context-menu').isVisible().catch(() => false))
    ? pass('canvas right-click context menu opens')
    : fail('canvas right-click context menu opens');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /Settings|设置/ }).click({ timeout: 5000 });
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: /Light|亮色/ }).click({ timeout: 5000 });
  const lightClass = (await page.locator('.app-shell').getAttribute('class')) ?? '';
  lightClass.includes('theme-light') ? pass('light theme applies') : fail('light theme applies', lightClass);
  await page.screenshot({ path: `${out}/05-settings-light.png` });

  await page.getByRole('button', { name: /More|更多/ }).click({ timeout: 5000 });
  await page.getByText(/Background report|后台仿真报告/).click({ timeout: 5000 });
  await page.locator('.fixed section input[type="number"]').first().waitFor({ timeout: 5000 });
  const backgroundInputCount = await page.locator('.fixed section input[type="number"]').count();
  backgroundInputCount >= 3
    ? pass('background simulation modal opens with numeric controls', `${backgroundInputCount} inputs`)
    : fail('background simulation modal opens with numeric controls', `${backgroundInputCount} inputs`);
  await page.locator('.fixed section button').first().click({ timeout: 5000 });
  await page.waitForTimeout(200);

  await page.getByRole('button', { name: /More|更多/ }).click({ timeout: 5000 });
  await page.getByText(/Tutorial|使用教程/).click({ timeout: 5000 });
  await page.waitForTimeout(500);
  const tutorialText = (await page.locator('body').textContent()) ?? '';
  tutorialText.includes('Factory_Takt_Simulator') && tutorialText.includes('SRC')
    ? pass('tutorial opens')
    : fail('tutorial opens', 'tutorial content missing');
  await page.screenshot({ path: `${out}/06-tutorial.png` });
} catch (error) {
  fail('smoke script fatal', error?.stack || String(error));
}

await browser.close();

const failed = results.filter((result) => !result.ok);
const report = [
  '# Factory_Takt_Simulator Smoke Test',
  '',
  `URL: ${appUrl}`,
  `Viewport: ${viewport.width}x${viewport.height}`,
  '',
  ...results.map((result) => `- ${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.detail ? `: ${result.detail}` : ''}`),
  '',
  '## Browser Console',
  consoleMessages.length ? consoleMessages.join('\n') : 'No console errors or warnings captured.',
  '',
].join('\n');

await fs.writeFile(`${out}/smoke-results.json`, JSON.stringify({ results, consoleMessages }, null, 2));
await fs.writeFile(`${out}/smoke-results.md`, report);
console.log(report);

if (failed.length > 0) process.exitCode = 1;
