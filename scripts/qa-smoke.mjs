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
  /Factory Takt Simulator/.test(introText) && /Line Takt Simulation|Factory Takt Simulator/.test(introText)
    ? pass('intro uses generic Factory Takt branding')
    : fail('intro uses generic Factory Takt branding', 'generic brand text missing');
  await page.screenshot({ path: `${out}/01-intro.png` });

  await page.locator('button[aria-label="Enter simulator"]').click({ force: true, noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: /More|更多/ }).click({ noWaitAfter: true, timeout: 5000 });
  await page.getByText(/Project overview|项目展示/).click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(350);
  const showcaseText = (await page.locator('body').textContent()) ?? '';
  showcaseText.includes('Factory Takt Simulator') && showcaseText.includes('FactoryTaktAgent')
    ? pass('project overview opens with bilingual visual content and agent bridge note')
    : fail('project overview opens with bilingual visual content and agent bridge note', 'overview text missing');
  const bridgeReady = await page.evaluate(() => Boolean(window.FactoryTaktAgent?.getSnapshot?.()));
  bridgeReady ? pass('agent bridge is available on window') : fail('agent bridge is available on window');
  const showcaseTwinMedia = await page.locator('img[src$="industrial-twin-demo.gif"]').evaluate((image) => ({
    complete: image instanceof HTMLImageElement ? image.complete : false,
    naturalWidth: image instanceof HTMLImageElement ? image.naturalWidth : 0,
  })).catch(() => ({ complete: false, naturalWidth: 0 }));
  showcaseTwinMedia.complete && showcaseTwinMedia.naturalWidth > 0
    ? pass('product overview loads the industrial twin walkthrough', JSON.stringify(showcaseTwinMedia))
    : fail('product overview loads the industrial twin walkthrough', JSON.stringify(showcaseTwinMedia));
  const importGuards = await page.evaluate(() => {
    const api = window.FactoryTaktAgent;
    const before = api?.getSnapshot?.();
    const valid = api?.runCommand({
      type: 'importScenario',
      json: JSON.stringify(api.exportScenarioObject()),
      name: 'Round-trip scenario',
    });
    const afterValid = api?.getSnapshot?.();
    const malformed = api?.runCommand({
      type: 'importScenario',
      json: JSON.stringify({
        nodes: [{ id: 'bad-node', type: 'deviceNode', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      }),
      name: 'Malformed scenario',
    });
    const oversized = api?.runCommand({
      type: 'importScenario',
      json: JSON.stringify({ nodes: [], edges: [], padding: 'x'.repeat(6_000_100) }),
      name: 'Oversized scenario',
    });
    const after = api?.getSnapshot?.();
    return {
      malformed,
      oversized,
      valid,
      validRoundTrip: before?.nodes.length === afterValid?.nodes.length && before?.edges.length === afterValid?.edges.length,
      stateUnchanged: afterValid?.nodes.length === after?.nodes.length && afterValid?.edges.length === after?.edges.length,
    };
  });
  importGuards.valid === true && importGuards.validRoundTrip
    ? pass('scenario exports pass the same validation boundary on round trip')
    : fail('scenario exports pass the same validation boundary on round trip', JSON.stringify(importGuards));
  importGuards.malformed === false && importGuards.oversized === false && importGuards.stateUnchanged
    ? pass('scenario imports reject malformed and oversized payloads without changing the workspace')
    : fail('scenario imports reject malformed and oversized payloads without changing the workspace', JSON.stringify(importGuards));
  await page.locator('header button').nth(0).click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(200);

  const asideButtons = await page.locator('aside button').evaluateAll((buttons) => buttons.map((button) => button.textContent?.trim() ?? ''));
  asideButtons.some((text) => text === 'Post' || text === '后段')
    ? pass('left module library exposes post-process tab')
    : fail('left module library exposes post-process tab', asideButtons.join(' | '));
  await page.locator('aside button').filter({ hasText: /Post|后段/ }).first().click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(250);
  (await page.locator('[data-device-type="merge_buffer"]').isVisible().catch(() => false))
    ? pass('post-process tab shows merge and downstream process cards')
    : fail('post-process tab shows merge and downstream process cards');
  await page.screenshot({ path: `${out}/02-post-process-tab.png` });

  await page.getByRole('button', { name: /Settings|设置/ }).click({ noWaitAfter: true, timeout: 5000 });
  await page.getByRole('button', { name: /Showcase|展示/ }).click({ noWaitAfter: true, timeout: 5000 });
  await page.locator('header button').nth(0).click({ noWaitAfter: true, timeout: 5000 });
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

  await page.getByRole('button', { name: /More|更多/ }).click({ noWaitAfter: true, timeout: 5000 });
  await page.getByText(/Full line example|完整产线示例/).click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/03-generic-full-line.png` });

  const focusedLayout = await page.evaluate(() => {
    const asides = Array.from(document.querySelectorAll('aside'));
    const rightAside = asides.at(-1);
    const footer = document.querySelector('footer');
    return {
      rightWidth: rightAside instanceof HTMLElement ? rightAside.getBoundingClientRect().width : 0,
      bottomHeight: footer instanceof HTMLElement ? footer.getBoundingClientRect().height : 0,
    };
  });
  focusedLayout.rightWidth <= 60 && focusedLayout.bottomHeight <= 48
    ? pass('full-line example opens in a canvas-focused layout', JSON.stringify(focusedLayout))
    : fail('full-line example opens in a canvas-focused layout', JSON.stringify(focusedLayout));

  const responsivePage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await responsivePage.addInitScript(() => localStorage.clear());
  await responsivePage.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await responsivePage.locator('button[aria-label="Enter simulator"]').click({ force: true, noWaitAfter: true, timeout: 5000 });
  await responsivePage.waitForFunction(() => Boolean(window.FactoryTaktAgent?.getSnapshot?.()));
  await responsivePage.evaluate(() => window.FactoryTaktAgent?.runCommand({ type: 'createFullLineExample' }));
  const telemetryExpand = responsivePage.locator('footer button').filter({ hasText: /Expand|展开/ });
  await telemetryExpand.waitFor({ state: 'visible', timeout: 15000 });
  await telemetryExpand.click({ force: true, noWaitAfter: true, timeout: 15000 });
  await responsivePage.waitForTimeout(250);
  const telemetryOverflow = await responsivePage.locator('.bottom-telemetry-shell').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  telemetryOverflow.scrollWidth <= telemetryOverflow.clientWidth + 1
    ? pass('bottom telemetry reflows without a horizontal scrollbar at 1440px', JSON.stringify(telemetryOverflow))
    : fail('bottom telemetry reflows without a horizontal scrollbar at 1440px', JSON.stringify(telemetryOverflow));
  await responsivePage.screenshot({ path: `${out}/04-responsive-telemetry.png` });
  await responsivePage.close();

  const twinPage = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await twinPage.addInitScript(() => localStorage.clear());
  await twinPage.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await twinPage.locator('button[aria-label="Enter simulator"]').click({ force: true, noWaitAfter: true, timeout: 5000 });
  await twinPage.waitForFunction(() => Boolean(window.FactoryTaktAgent?.getSnapshot?.()));
  await twinPage.waitForFunction(() => (window.FactoryTaktAgent?.getSnapshot?.().nodes.length ?? 0) > 0);
  await twinPage.waitForTimeout(300);
  await twinPage.evaluate(() => window.FactoryTaktAgent?.runCommand({ type: 'createFullLineExample' }));
  await twinPage.waitForFunction(() => window.FactoryTaktAgent?.getSnapshot?.().nodes.length === 43);
  await twinPage.waitForTimeout(300);
  const laptopLayout = await twinPage.evaluate(() => {
    const header = document.querySelector('header');
    const nodes = Array.from(document.querySelectorAll('.react-flow__node')).map((element) => {
      const rect = element.getBoundingClientRect();
      return { id: element.getAttribute('data-id'), x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const overlaps = [];
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const a = nodes[left];
        const b = nodes[right];
        const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        if (overlapX > 0 && overlapY > 0) overlaps.push(`${a.id}:${b.id}`);
      }
    }
    return {
      headerClientWidth: header?.clientWidth ?? 0,
      headerScrollWidth: header?.scrollWidth ?? 0,
      nodeCount: nodes.length,
      overlaps,
    };
  });
  laptopLayout.headerScrollWidth <= laptopLayout.headerClientWidth && laptopLayout.nodeCount === 43 && laptopLayout.overlaps.length === 0
    ? pass('1280px workbench has no toolbar overflow or overlapping full-line nodes', JSON.stringify(laptopLayout))
    : fail('1280px workbench has no toolbar overflow or overlapping full-line nodes', JSON.stringify(laptopLayout));

  await twinPage.locator('[data-testid="twin-status-rail"]').click({ noWaitAfter: true, timeout: 5000 });
  await twinPage.getByRole('button', { name: /AI|AI 分析/ }).click({ noWaitAfter: true, timeout: 5000 });
  await twinPage.getByRole('button', { name: /Analyze canvas|分析当前画板/ }).click({ noWaitAfter: true, timeout: 5000 });
  await twinPage.locator('[aria-live="polite"]').waitFor({ state: 'visible', timeout: 5000 });
  const twinConsoleState = await twinPage.evaluate(() => ({
    assets: window.FactoryTaktAgent?.getSnapshot?.().industrial?.snapshot.assets.length ?? 0,
    localResult: document.querySelector('[aria-live="polite"]')?.textContent?.includes('local-rules') ?? false,
    dockOverflow: (() => {
      const dock = document.querySelector('[aria-label="Live digital twin console"], [aria-label="实时数字孪生控制台"]');
      return dock ? dock.scrollWidth - dock.clientWidth : 0;
    })(),
  }));
  twinConsoleState.assets === 43 && twinConsoleState.localResult && twinConsoleState.dockOverflow <= 1
    ? pass('digital twin console opens with bounded local analysis at laptop width', JSON.stringify(twinConsoleState))
    : fail('digital twin console opens with bounded local analysis at laptop width', JSON.stringify(twinConsoleState));
  await twinPage.screenshot({ path: `${out}/05-industrial-twin-laptop.png` });
  await twinPage.close();

  const scenarioChecks = await page.evaluate(() => {
    const rawValues = Object.values(localStorage).join('\n');
    return {
      hasMergeStore: rawValues.includes('line-join-store'),
      hasPack: rawValues.includes('line-join-pack'),
      hasPartAMain: rawValues.includes('Part A main line -> MERGE'),
      hasPartBMain: rawValues.includes('Part B main line -> MERGE'),
      hasTravel40: rawValues.includes('"travelTimeSec":40'),
      hasDispatch3: rawValues.includes('"dispatchIntervalSec":3'),
      visibleNodes: document.querySelectorAll('.react-flow__node').length,
      visibleEdges: document.querySelectorAll('.react-flow__edge').length,
    };
  });
  scenarioChecks.hasMergeStore &&
  scenarioChecks.hasPack &&
  scenarioChecks.hasPartAMain &&
  scenarioChecks.hasPartBMain &&
  scenarioChecks.hasTravel40 &&
  scenarioChecks.hasDispatch3
    ? pass('generic full-line demo is connected through merge with 3s dispatch and 40s travel', JSON.stringify(scenarioChecks))
    : fail('generic full-line demo is connected through merge with 3s dispatch and 40s travel', JSON.stringify(scenarioChecks));

  const layoutDirectionChecks = await page.evaluate(() => {
    const readPortSide = (nodeId, kind) =>
      document
        .querySelector(`.react-flow__node[data-id="${nodeId}"] [data-port-kind="${kind}"]`)
        ?.getAttribute('data-port-physical-side') ?? '';
    const readDirection = (nodeId) =>
      document
        .querySelector(`.react-flow__node[data-id="${nodeId}"] [data-flow-direction]`)
        ?.getAttribute('data-flow-direction') ?? '';
    const snapshot = window.FactoryTaktAgent?.getSnapshot?.();
    const nodeMap = new Map(snapshot?.nodes.map((node) => [node.id, node]) ?? []);
    const reverseRun = [
      ['line-join-wash-2', 'line-join-dryer'],
      ['line-join-dryer', 'line-join-perf-final'],
      ['line-join-perf-final', 'line-join-fill'],
      ['line-join-fill', 'line-join-press'],
      ['line-join-press', 'line-join-perf-closed'],
      ['line-join-visual', 'line-join-manual'],
      ['line-join-manual', 'line-join-surface'],
      ['line-join-surface', 'line-join-pack'],
    ];
    const horizontalGaps = reverseRun.map(([sourceId, targetId]) => {
      const source = nodeMap.get(sourceId);
      const target = nodeMap.get(targetId);
      return source && target ? Math.abs(target.position.x - source.position.x) : 0;
    });
    return {
      forwardDirection: readDirection('line-join-func'),
      forwardInputSide: readPortSide('line-join-func', 'in'),
      forwardOutputSide: readPortSide('line-join-func', 'out'),
      reverseDirection: readDirection('line-join-dryer'),
      reverseInputSide: readPortSide('line-join-dryer', 'in'),
      reverseOutputSide: readPortSide('line-join-dryer', 'out'),
      minReverseGap: Math.min(...horizontalGaps),
    };
  });
  layoutDirectionChecks.forwardDirection === 'ltr' &&
  layoutDirectionChecks.forwardInputSide === 'left' &&
  layoutDirectionChecks.forwardOutputSide === 'right'
    ? pass('forward process cards expose left-in and right-out ports', JSON.stringify(layoutDirectionChecks))
    : fail('forward process cards expose left-in and right-out ports', JSON.stringify(layoutDirectionChecks));
  layoutDirectionChecks.reverseDirection === 'rtl' &&
  layoutDirectionChecks.reverseInputSide === 'right' &&
  layoutDirectionChecks.reverseOutputSide === 'left'
    ? pass('return-flow process cards expose right-in and left-out ports', JSON.stringify(layoutDirectionChecks))
    : fail('return-flow process cards expose right-in and left-out ports', JSON.stringify(layoutDirectionChecks));
  layoutDirectionChecks.minReverseGap >= 220
    ? pass('return-flow links keep enough visible travel distance', `${layoutDirectionChecks.minReverseGap}px minimum column gap`)
    : fail('return-flow links keep enough visible travel distance', `${layoutDirectionChecks.minReverseGap}px minimum column gap`);

  await page.evaluate(() => {
    const api = window.FactoryTaktAgent;
    api?.runCommand({ type: 'reset' });
    api?.runCommand({ type: 'setSpeed', speed: 20 });
    api?.runCommand({ type: 'start' });
  });
  await page.waitForTimeout(6500);
  const feederContinuity = await page.evaluate(() => {
    const snapshot = window.FactoryTaktAgent?.getSnapshot?.();
    const feeder = snapshot?.nodes.find((node) => node.id === 'line-feed');
    const feedEdges = snapshot?.edges.filter((edge) => edge.source === 'line-feed') ?? [];
    const downstreamInput = snapshot?.nodes
      .filter((node) => node.id === 'line-feed-a-inspection' || node.id === 'line-feed-b-inspection')
      .reduce((sum, node) => sum + node.data.params.inputBufferCount + node.data.metrics.totalInput, 0) ?? 0;
    return {
      status: feeder?.data.runtime.status,
      currentStorageCount: feeder?.data.params.currentStorageCount,
      totalOutput: feeder?.data.metrics.totalOutput,
      partAStorageCount: feeder?.data.params.partAStorageCount,
      partBStorageCount: feeder?.data.params.partBStorageCount,
      downstreamInput,
      edgeWarnings: feedEdges.map((edge) => edge.data?.warning ?? '').filter(Boolean),
    };
  });
  feederContinuity.status !== 'waiting_material' &&
  feederContinuity.currentStorageCount > 249500 &&
  feederContinuity.totalOutput > 2 &&
  feederContinuity.downstreamInput > 0
    ? pass('full-line feeder keeps supplying after the first material pair', JSON.stringify(feederContinuity))
    : fail('full-line feeder keeps supplying after the first material pair', JSON.stringify(feederContinuity));
  await page.evaluate(() => {
    const api = window.FactoryTaktAgent;
    api?.runCommand({ type: 'pause' });
  });
  const pausedHeader = (await page.locator('header').textContent()) ?? '';
  /PAUSED|已暂停/.test(pausedHeader)
    ? pass('paused simulation is labeled as paused instead of stopped')
    : fail('paused simulation is labeled as paused instead of stopped', pausedHeader);
  await page.evaluate(() => {
    const api = window.FactoryTaktAgent;
    api?.runCommand({ type: 'reset' });
    api?.runCommand({ type: 'setSpeed', speed: 2 });
  });

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

  await page.locator('.edge-label').first().click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(150);
  const activeEdgeLabels = await page.locator('.edge-label').evaluateAll((labels) =>
    labels.filter((label) => (label.textContent ?? '').includes('/h')).length,
  );
  activeEdgeLabels === 1 ? pass('selecting an edge expands only one edge label') : fail('selecting an edge expands only one edge label', `${activeEdgeLabels}`);

  await page.evaluate(() => {
    const api = window.FactoryTaktAgent;
    const snapshot = api?.getSnapshot?.();
    const edge = snapshot?.edges.find((item) => item.data?.label === 'FEED-QA A') ?? snapshot?.edges[0];
    if (api && edge) {
      api.runCommand({
        type: 'updateNode',
        nodeId: 'line-feed',
        patch: {
          outputBufferCount: 20,
          currentStorageCount: 2000,
          feedIntervalSec: 1,
        },
      });
      api.runCommand({
        type: 'updateEdge',
        edgeId: edge.id,
        patch: {
          batchSize: 1,
          dispatchIntervalSec: 1,
          travelTimeSec: 20,
          lineBufferCapacity: 20,
        },
      });
      api.runCommand({ type: 'setSpeed', speed: 1 });
    }
  });
  await page.getByRole('button', { name: /Start|开始/ }).click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(5500);
  const dotMotion = await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const read = () =>
      Array.from(document.querySelectorAll('.material-flow-dot')).map((node) => {
        const element = node instanceof HTMLElement ? node : null;
        return {
          id: element?.dataset.packetId ?? '',
          offset: element?.style.offsetDistance ?? '',
        };
      });
    let before = [];
    for (let attempt = 0; attempt < 25; attempt += 1) {
      before = read();
      if (before.length > 0) break;
      await wait(100);
    }
    if (before.length === 0) return { seen: 0, observed: false, detail: 'no material dots visible while sampling' };
    await wait(500);
    const after = read();
    const beforeById = new Map(before.map((dot) => [dot.id, dot.offset]));
    const moved = after.filter((dot) => dot.id && beforeById.has(dot.id) && beforeById.get(dot.id) !== dot.offset).length;
    const completed = after.length !== before.length;
    return {
      seen: before.length,
      observed: moved > 0 || completed,
      detail: `${moved}/${after.length} moved, completed=${completed}`,
    };
  });
  dotMotion.seen > 0
    ? pass('line motion renders real material dots', `movers=${dotMotion.seen}`)
    : fail('line motion renders real material dots', `movers=${dotMotion.seen}`);
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
  dotMotion.observed
    ? pass('material dots advance smoothly on active conveyors', dotMotion.detail)
    : fail('material dots advance smoothly on active conveyors', dotMotion.detail);
  await page.screenshot({ path: `${out}/04-showcase-running.png` });

  const edgeCountBeforeClickConnect = await page.locator('.react-flow__edge').count();
  await page.locator('[data-node-short-name="FEED"] .node-port-label-out').nth(1).click({ force: true, noWaitAfter: true, timeout: 5000 });
  await page.locator('.node-port-label-in').nth(1).click({ force: true, noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(350);
  const edgeCountAfterClickConnect = await page.locator('.react-flow__edge').count();
  edgeCountAfterClickConnect > edgeCountBeforeClickConnect
    ? pass('click connection works from feeder output to inspection input', `${edgeCountBeforeClickConnect} -> ${edgeCountAfterClickConnect}`)
    : fail('click connection works from feeder output to inspection input', `${edgeCountBeforeClickConnect} -> ${edgeCountAfterClickConnect}`);

  await page.locator('.node-port-label-out').first().click({ force: true, noWaitAfter: true, timeout: 5000 });
  (await page.locator('[data-testid="port-rule-editor"]').isVisible().catch(() => false))
    ? pass('clicking an output port opens port rule editor')
    : fail('clicking an output port opens port rule editor');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  await page.mouse.click((canvasBox?.x ?? 300) + 220, (canvasBox?.y ?? 90) + 160, { button: 'right' });
  await page.waitForTimeout(200);
  (await page.locator('.context-menu').isVisible().catch(() => false))
    ? pass('canvas right-click context menu opens')
    : fail('canvas right-click context menu opens');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /Settings|设置/ }).click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: /Light|亮色/ }).click({ noWaitAfter: true, timeout: 5000 });
  const lightClass = (await page.locator('.app-shell').getAttribute('class')) ?? '';
  lightClass.includes('theme-light') ? pass('light theme applies') : fail('light theme applies', lightClass);
  await page.screenshot({ path: `${out}/05-settings-light.png` });

  await page.getByRole('button', { name: /More|更多/ }).click({ noWaitAfter: true, timeout: 5000 });
  await page.getByText(/Background report|后台仿真报告/).click({ noWaitAfter: true, timeout: 5000 });
  await page.locator('.fixed section input[type="number"]').first().waitFor({ timeout: 5000 });
  const backgroundInputCount = await page.locator('.fixed section input[type="number"]').count();
  backgroundInputCount >= 3
    ? pass('background simulation modal opens with numeric controls', `${backgroundInputCount} inputs`)
    : fail('background simulation modal opens with numeric controls', `${backgroundInputCount} inputs`);
  await page.locator('.fixed section button').first().click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(200);

  await page.getByRole('button', { name: /More|更多/ }).click({ noWaitAfter: true, timeout: 5000 });
  await page.getByText(/Tutorial|使用教程/).click({ noWaitAfter: true, timeout: 5000 });
  await page.waitForTimeout(500);
  const tutorialText = (await page.locator('body').textContent()) ?? '';
  tutorialText.includes('Factory Takt Simulator') && tutorialText.includes('SRC')
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
