import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createIndustrialGateway } from './gateway.mjs';

let gateway;
let baseUrl;

before(async () => {
  gateway = createIndustrialGateway({
    host: '127.0.0.1',
    port: 0,
    ingestToken: 'test-ingest-token',
    deepseekApiKey: '',
    allowCommands: false,
  });
  await new Promise((resolve) => gateway.server.listen(0, '127.0.0.1', resolve));
  const address = gateway.server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  gateway.stopBackgroundTasks();
  await new Promise((resolve) => gateway.server.close(resolve));
});

test('health and empty snapshot do not expose secrets', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.aiConfigured, false);
  assert.equal(JSON.stringify(body).includes('test-ingest-token'), false);
});

test('ingest rejects missing authorization', async () => {
  const response = await fetch(`${baseUrl}/api/industrial/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schemaVersion: '1.0', assets: [], alarms: [] }),
  });
  assert.equal(response.status, 401);
});

test('requests from unknown browser origins are rejected', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://attacker.example' },
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);

  const unknownLocalOrigin = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'http://127.0.0.1:9999' },
  });
  assert.equal(unknownLocalOrigin.status, 403);
});

test('ingest rejects duplicate assets and dangling alarm references', async () => {
  const headers = { Authorization: 'Bearer test-ingest-token', 'Content-Type': 'application/json' };
  const duplicateResponse = await fetch(`${baseUrl}/api/industrial/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      schemaVersion: '1.0',
      source: 'generic',
      assets: [{ assetId: 'duplicate' }, { assetId: 'duplicate' }],
      alarms: [],
    }),
  });
  assert.equal(duplicateResponse.status, 400);

  const danglingAlarmResponse = await fetch(`${baseUrl}/api/industrial/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      schemaVersion: '1.0',
      source: 'generic',
      assets: [{ assetId: 'known' }],
      alarms: [{ id: 'dangling', assetId: 'unknown', state: 'active' }],
    }),
  });
  assert.equal(danglingAlarmResponse.status, 400);
});

test('ingest sanitizes a valid normalized snapshot', async () => {
  const now = new Date().toISOString();
  const snapshot = {
    schemaVersion: '1.0',
    source: 'ignition',
    generatedAt: now,
    sequence: 12,
    assets: [{
      assetId: 'process-a',
      nodeId: 'process-a',
      displayName: 'Process A',
      equipmentPath: 'Enterprise/Site-A/Area-01/Line-01/PROC-A',
      source: 'ignition',
      plc: { mode: 'auto', run: true, ready: true, fault: false, heartbeat: 12, programState: 'RUN' },
      action: { name: 'process', progress: 0.42, cycleId: 'PROC-A-12', startedAt: now },
      sensors: [{ id: 'part', label: 'Part present', tagPath: '[default]PROC-A/Part', value: true, quality: 'good', updatedAt: now }],
      actuators: [{ id: 'clamp', label: 'Clamp valve', tagPath: '[default]PROC-A/Clamp', kind: 'solenoid', command: true, feedback: true, interlocked: false, quality: 'good', updatedAt: now }],
      cycleCount: 12,
      goodCount: 12,
      rejectCount: 0,
      lastUpdated: now,
    }],
    alarms: [],
  };
  const response = await fetch(`${baseUrl}/api/industrial/events`, {
    method: 'POST',
    headers: { Authorization: 'Bearer test-ingest-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  assert.equal(response.status, 202);
  const stored = await (await fetch(`${baseUrl}/api/industrial/snapshot`)).json();
  assert.equal(stored.assets[0].plc.mode, 'auto');
  assert.equal(stored.assets[0].sensors[0].value, true);
});

test('command execution remains disabled while preview is available', async () => {
  gateway.state.previews.set('expired-preview', {
    previewId: 'expired-preview',
    expiresAt: new Date(0).toISOString(),
  });
  const previewResponse = await fetch(`${baseUrl}/api/industrial/commands/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId: 'process-a', command: 'request_hold', requestedValue: true }),
  });
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json();
  assert.equal(preview.dryRun, true);
  assert.equal(gateway.state.previews.has('expired-preview'), false);
  const executeResponse = await fetch(`${baseUrl}/api/industrial/commands/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ previewId: preview.previewId }),
  });
  assert.equal(executeResponse.status, 403);
});

test('AI endpoint is closed when no server-side key is configured', async () => {
  const response = await fetch(`${baseUrl}/api/ai/assist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': 'fts_test_session' },
    body: JSON.stringify({ question: 'Where is the bottleneck?' }),
  });
  assert.equal(response.status, 503);
});
