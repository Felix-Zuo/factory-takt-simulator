import { createServer } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import {
  buildAiPayload,
  hashRequest,
  sanitizeAiResult,
  sessionUserId,
} from './ai-policy.mjs';

const JSON_LIMIT = 256 * 1024;
const AI_JSON_LIMIT = 72 * 1024;
const UPSTREAM_AI_JSON_LIMIT = 512 * 1024;
const MAX_ASSETS = 500;
const MAX_ALARMS = 1000;
const MAX_COMMAND_PREVIEWS = 256;
const MAX_AI_CACHE_ENTRIES = 128;
const COMMANDS = new Set(['request_hold', 'request_resume', 'acknowledge_alarm', 'reset_fault']);
const LOCAL_ORIGINS = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5190',
  'http://localhost:5190',
]);

const numberFromEnv = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};
const boolFromEnv = (value, fallback = false) =>
  value === undefined ? fallback : /^(1|true|yes|on)$/i.test(String(value));
const listFromEnv = (value) => new Set(String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean));

export const readGatewayConfig = (env = process.env) => ({
  host: env.INDUSTRIAL_GATEWAY_HOST || '127.0.0.1',
  port: numberFromEnv(env.INDUSTRIAL_GATEWAY_PORT, 8787, 1, 65535),
  allowedOrigins: new Set([...LOCAL_ORIGINS, ...listFromEnv(env.INDUSTRIAL_ALLOWED_ORIGINS)]),
  ingestToken: env.INDUSTRIAL_INGEST_TOKEN || '',
  operatorToken: env.INDUSTRIAL_OPERATOR_TOKEN || '',
  allowCommands: boolFromEnv(env.INDUSTRIAL_ALLOW_COMMANDS, false),
  commandAssets: listFromEnv(env.INDUSTRIAL_COMMAND_ASSETS),
  mesCommandUrl: env.MES_COMMAND_URL || '',
  mesCommandToken: env.MES_COMMAND_TOKEN || '',
  ignitionSnapshotUrl: env.IGNITION_SNAPSHOT_URL || '',
  ignitionBearerToken: env.IGNITION_BEARER_TOKEN || '',
  ignitionPollMs: numberFromEnv(env.IGNITION_POLL_MS, 1000, 250, 60_000),
  maxSseClients: numberFromEnv(env.INDUSTRIAL_MAX_SSE_CLIENTS, 32, 1, 1000),
  deepseekApiKey: env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl: env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  allowCustomDeepseekBaseUrl: boolFromEnv(env.DEEPSEEK_ALLOW_CUSTOM_BASE_URL, false),
  deepseekModel: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  aiMaxOutputTokens: numberFromEnv(env.AI_MAX_OUTPUT_TOKENS, 700, 100, 1200),
  aiDailyTokenBudget: numberFromEnv(env.AI_DAILY_TOKEN_BUDGET, 25_000, 1000, 5_000_000),
  aiSessionCallsPerHour: numberFromEnv(env.AI_SESSION_CALLS_PER_HOUR, 6, 1, 100),
  aiTimeoutMs: numberFromEnv(env.AI_TIMEOUT_MS, 30_000, 3000, 120_000),
  aiCacheTtlMs: numberFromEnv(env.AI_CACHE_TTL_MS, 600_000, 0, 86_400_000),
});

const emptySnapshot = () => ({
  schemaVersion: '1.0',
  source: 'generic',
  generatedAt: new Date().toISOString(),
  sequence: 0,
  assets: [],
  alarms: [],
});

const safeText = (value, max = 240) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const safeNumber = (value, fallback = 0, min = -1e9, max = 1e9) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};
const validationError = (message) => Object.assign(new Error(message), { statusCode: 400 });
const signalValue = (value) => {
  if (typeof value === 'boolean' || typeof value === 'string') return typeof value === 'string' ? value.slice(0, 240) : value;
  return safeNumber(value);
};
const enumValue = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

const sanitizeSignal = (value, index, prefix) => ({
  id: safeText(value?.id, 120) || `${prefix}:signal:${index}`,
  label: safeText(value?.label, 120) || `Signal ${index + 1}`,
  tagPath: safeText(value?.tagPath, 360),
  value: signalValue(value?.value),
  ...(safeText(value?.unit, 24) ? { unit: safeText(value.unit, 24) } : {}),
  quality: enumValue(value?.quality, ['good', 'uncertain', 'bad'], 'bad'),
  updatedAt: safeText(value?.updatedAt, 40) || new Date().toISOString(),
});

const sanitizeActuator = (value, index, prefix) => ({
  id: safeText(value?.id, 120) || `${prefix}:actuator:${index}`,
  label: safeText(value?.label, 120) || `Actuator ${index + 1}`,
  tagPath: safeText(value?.tagPath, 360),
  kind: enumValue(value?.kind, ['solenoid', 'motor', 'servo', 'relay'], 'relay'),
  command: signalValue(value?.command),
  feedback: signalValue(value?.feedback),
  interlocked: Boolean(value?.interlocked),
  quality: enumValue(value?.quality, ['good', 'uncertain', 'bad'], 'bad'),
  updatedAt: safeText(value?.updatedAt, 40) || new Date().toISOString(),
});

const sanitizeAsset = (value, index) => {
  const assetId = safeText(value?.assetId, 120) || `asset-${index + 1}`;
  return {
    assetId,
    nodeId: safeText(value?.nodeId, 120) || assetId,
    displayName: safeText(value?.displayName, 120) || assetId,
    equipmentPath: safeText(value?.equipmentPath, 360),
    source: enumValue(value?.source, ['demo', 'ignition', 'sparkplug', 'mes-rest', 'generic'], 'generic'),
    plc: {
      mode: enumValue(value?.plc?.mode, ['auto', 'manual', 'maintenance', 'offline'], 'offline'),
      run: Boolean(value?.plc?.run),
      ready: Boolean(value?.plc?.ready),
      fault: Boolean(value?.plc?.fault),
      heartbeat: safeNumber(value?.plc?.heartbeat, 0, 0, Number.MAX_SAFE_INTEGER),
      programState: safeText(value?.plc?.programState, 120),
    },
    action: {
      name: enumValue(
        value?.action?.name,
        ['idle', 'waiting', 'load', 'clamp', 'process', 'inspect', 'transfer', 'unload', 'hold', 'service', 'fault'],
        'idle',
      ),
      progress: safeNumber(value?.action?.progress, 0, 0, 1),
      cycleId: safeText(value?.action?.cycleId, 120),
      startedAt: safeText(value?.action?.startedAt, 40) || null,
    },
    sensors: Array.isArray(value?.sensors) ? value.sensors.slice(0, 64).map((item, itemIndex) => sanitizeSignal(item, itemIndex, assetId)) : [],
    actuators: Array.isArray(value?.actuators) ? value.actuators.slice(0, 64).map((item, itemIndex) => sanitizeActuator(item, itemIndex, assetId)) : [],
    cycleCount: safeNumber(value?.cycleCount, 0, 0, Number.MAX_SAFE_INTEGER),
    goodCount: safeNumber(value?.goodCount, 0, 0, Number.MAX_SAFE_INTEGER),
    rejectCount: safeNumber(value?.rejectCount, 0, 0, Number.MAX_SAFE_INTEGER),
    lastUpdated: safeText(value?.lastUpdated, 40) || new Date().toISOString(),
  };
};

const sanitizeAlarm = (value, index, knownAssets) => {
  const assetId = safeText(value?.assetId, 120);
  if (!knownAssets.has(assetId)) return null;
  return {
    id: safeText(value?.id, 160) || `${assetId}:alarm:${index}`,
    assetId,
    code: safeText(value?.code, 80) || 'UNSPECIFIED',
    title: safeText(value?.title, 160) || 'Equipment alarm',
    message: safeText(value?.message, 800),
    severity: enumValue(value?.severity, ['critical', 'high', 'medium', 'low', 'info'], 'info'),
    state: enumValue(value?.state, ['active', 'acknowledged', 'cleared'], 'active'),
    source: safeText(value?.source, 240),
    occurredAt: safeText(value?.occurredAt, 40) || new Date().toISOString(),
    ...(safeText(value?.acknowledgedAt, 40) ? { acknowledgedAt: safeText(value.acknowledgedAt, 40) } : {}),
    ...(safeText(value?.clearedAt, 40) ? { clearedAt: safeText(value.clearedAt, 40) } : {}),
  };
};

export const sanitizeSnapshot = (value) => {
  if (!value || typeof value !== 'object' || value.schemaVersion !== '1.0') throw validationError('Unsupported industrial snapshot schema.');
  if (!Array.isArray(value.assets) || value.assets.length > MAX_ASSETS) throw validationError('Industrial snapshot has an invalid asset collection.');
  if (!Array.isArray(value.alarms) || value.alarms.length > MAX_ALARMS) throw validationError('Industrial snapshot has an invalid alarm collection.');
  const assets = value.assets.map(sanitizeAsset);
  const ids = new Set();
  for (const asset of assets) {
    if (ids.has(asset.assetId)) throw validationError(`Duplicate asset id: ${asset.assetId}`);
    ids.add(asset.assetId);
  }
  const alarms = value.alarms.map((item, index) => sanitizeAlarm(item, index, ids));
  if (alarms.some((alarm) => alarm === null)) throw validationError('Industrial alarm references an unknown asset.');
  return {
    schemaVersion: '1.0',
    source: enumValue(value.source, ['demo', 'ignition', 'sparkplug', 'mes-rest', 'generic'], 'generic'),
    generatedAt: safeText(value.generatedAt, 40) || new Date().toISOString(),
    sequence: safeNumber(value.sequence, 0, 0, Number.MAX_SAFE_INTEGER),
    assets,
    alarms,
  };
};

const tokenMatches = (expected, authorization) => {
  if (!expected || !authorization?.startsWith('Bearer ')) return false;
  const actual = authorization.slice(7);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
};

const readJsonBody = (request, limit) => new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  request.on('data', (chunk) => {
    size += chunk.length;
    if (size > limit) {
      reject(Object.assign(new Error('Request body too large.'), { statusCode: 413 }));
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on('end', () => {
    try {
      resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
    } catch {
      reject(Object.assign(new Error('Request body is not valid JSON.'), { statusCode: 400 }));
    }
  });
  request.on('error', reject);
});

const readBoundedResponseJson = async (response, limit) => {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new Error('Upstream response is too large.');
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error('Upstream response is too large.');
    }
    chunks.push(Buffer.from(value));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new Error('Upstream response is not valid JSON.');
  }
};

const sendJson = (response, statusCode, value, headers = {}) => {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(body);
};

const allowedOrigin = (origin, config) => !origin || config.allowedOrigins.has(origin);

const corsHeaders = (request, config) => {
  const origin = request.headers.origin;
  return origin && allowedOrigin(origin, config)
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
    : {};
};

const validateConfiguredUrl = (raw, { deepseek = false, allowCustom = false } = {}) => {
  const url = new URL(raw);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && !deepseek)) throw new Error('Configured URL uses an unsupported protocol.');
  if (deepseek && !allowCustom && url.hostname !== 'api.deepseek.com') throw new Error('Custom DeepSeek base URLs require DEEPSEEK_ALLOW_CUSTOM_BASE_URL=true.');
  return url.toString().replace(/\/$/, '');
};

const commandImpact = (command) => ({
  request_hold: 'Requests a controlled production hold; the PLC safety program remains authoritative.',
  request_resume: 'Requests resume only after downstream interlocks and operator authorization are valid.',
  acknowledge_alarm: 'Acknowledges an MES/SCADA alarm record without clearing the equipment condition.',
  reset_fault: 'Requests a fault-reset sequence; safety and equipment interlocks may reject it.',
})[command];

export function createIndustrialGateway(configOverrides = {}) {
  const config = { ...readGatewayConfig(), ...configOverrides };
  const state = {
    snapshot: emptySnapshot(),
    clients: new Set(),
    previews: new Map(),
    rate: new Map(),
    aiSessions: new Map(),
    aiInFlight: new Set(),
    aiCache: new Map(),
    aiDay: new Date().toISOString().slice(0, 10),
    aiTokens: 0,
  };

  const writeStreamFrame = (client, frame) => {
    if (client.destroyed || client.writableEnded) {
      state.clients.delete(client);
      return;
    }
    try {
      client.write(frame);
    } catch {
      state.clients.delete(client);
      client.destroy();
    }
  };

  const publish = (snapshot) => {
    state.snapshot = snapshot;
    const frame = `data: ${JSON.stringify(snapshot)}\n\n`;
    for (const client of state.clients) writeStreamFrame(client, frame);
  };

  const prunePreviews = (now = Date.now(), enforceCapacity = false) => {
    for (const [previewId, preview] of state.previews) {
      if (Date.parse(preview.expiresAt) <= now) state.previews.delete(previewId);
    }
    while (enforceCapacity && state.previews.size >= MAX_COMMAND_PREVIEWS) {
      state.previews.delete(state.previews.keys().next().value);
    }
  };

  const pruneAiState = (now = Date.now()) => {
    for (const [sessionId, times] of state.aiSessions) {
      const recent = times.filter((time) => now - time < 3_600_000);
      if (recent.length > 0) state.aiSessions.set(sessionId, recent);
      else state.aiSessions.delete(sessionId);
    }
    for (const [cacheKey, cached] of state.aiCache) {
      if (now - cached.createdAt >= config.aiCacheTtlMs) state.aiCache.delete(cacheKey);
    }
    while (state.aiCache.size > MAX_AI_CACHE_ENTRIES) {
      state.aiCache.delete(state.aiCache.keys().next().value);
    }
  };

  const isRateLimited = (request, bucket, limit = 120) => {
    const key = `${bucket}:${request.socket.remoteAddress || 'unknown'}`;
    const now = Date.now();
    pruneAiState(now);
    const entry = state.rate.get(key) ?? { start: now, count: 0 };
    if (now - entry.start > 60_000) {
      entry.start = now;
      entry.count = 0;
    }
    entry.count += 1;
    state.rate.set(key, entry);
    return entry.count > limit;
  };

  const handleAi = async (request, response, headers) => {
    if (!config.deepseekApiKey) return sendJson(response, 503, { error: 'DeepSeek is not configured on this gateway.' }, headers);
    if (isRateLimited(request, 'ai', 20)) return sendJson(response, 429, { error: 'AI request rate exceeded.' }, headers);
    const sessionId = safeText(request.headers['x-session-id'], 80);
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) return sendJson(response, 400, { error: 'A valid X-Session-Id header is required.' }, headers);
    if (state.aiInFlight.has(sessionId)) return sendJson(response, 429, { error: 'Only one AI request may run per session.' }, headers);

    const now = Date.now();
    const calls = (state.aiSessions.get(sessionId) ?? []).filter((time) => now - time < 3_600_000);
    if (calls.length >= config.aiSessionCallsPerHour) return sendJson(response, 429, { error: 'Hourly AI call budget reached for this session.' }, headers);
    const today = new Date().toISOString().slice(0, 10);
    if (state.aiDay !== today) {
      state.aiDay = today;
      state.aiTokens = 0;
    }
    if (state.aiTokens >= config.aiDailyTokenBudget) return sendJson(response, 429, { error: 'Daily AI token budget reached.' }, headers);

    const body = await readJsonBody(request, AI_JSON_LIMIT);
    const mode = enumValue(body.mode, ['analyze', 'teach', 'explain'], 'analyze');
    const language = enumValue(body.language, ['zh-CN', 'en'], 'zh-CN');
    const question = safeText(body.question, 600);
    const report = safeText(body.report, 18_000);
    const context = body.context && typeof body.context === 'object' && !Array.isArray(body.context) ? body.context : {};
    if (!question) return sendJson(response, 400, { error: 'Question is required.' }, headers);
    const contextJson = JSON.stringify(context);
    if (contextJson.length > 32_000) return sendJson(response, 413, { error: 'Analysis context is too large.' }, headers);
    const estimatedInputTokens = Math.ceil((question.length + report.length + contextJson.length + 2200) / 4);
    if (state.aiTokens + estimatedInputTokens + config.aiMaxOutputTokens > config.aiDailyTokenBudget) {
      return sendJson(response, 429, { error: 'This request would exceed the daily AI token budget.' }, headers);
    }

    const model = config.deepseekModel === 'deepseek-v4-flash' ? config.deepseekModel : 'deepseek-v4-flash';
    const payload = buildAiPayload({
      mode,
      question,
      language,
      report,
      context,
      model,
      maxTokens: config.aiMaxOutputTokens,
      userId: sessionUserId(sessionId),
    });
    const cacheKey = hashRequest(JSON.stringify(payload));
    const cached = state.aiCache.get(cacheKey);
    if (cached && now - cached.createdAt < config.aiCacheTtlMs) {
      return sendJson(response, 200, { ...cached.result, cached: true }, headers);
    }

    state.aiInFlight.add(sessionId);
    state.aiSessions.set(sessionId, [...calls, now]);
    try {
      const baseUrl = validateConfiguredUrl(config.deepseekBaseUrl, { deepseek: true, allowCustom: config.allowCustomDeepseekBaseUrl });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs);
      let upstream;
      try {
        upstream = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.deepseekApiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      const upstreamPayload = await readBoundedResponseJson(upstream, UPSTREAM_AI_JSON_LIMIT);
      if (!upstream.ok) throw new Error(`DeepSeek request failed (${upstream.status}).`);
      const content = upstreamPayload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('DeepSeek response did not include content.');
      const parsed = JSON.parse(content);
      const usage = upstreamPayload.usage ?? {};
      const totalTokens = safeNumber(usage.total_tokens, estimatedInputTokens, 0, 10_000_000);
      state.aiTokens += totalTokens;
      const result = sanitizeAiResult(parsed, usage, Math.max(0, config.aiDailyTokenBudget - state.aiTokens));
      state.aiCache.set(cacheKey, { createdAt: now, result });
      pruneAiState(now);
      return sendJson(response, 200, result, headers);
    } catch (error) {
      const message = error?.name === 'AbortError' ? 'DeepSeek request timed out.' : safeText(error?.message, 300) || 'DeepSeek request failed.';
      return sendJson(response, 502, { error: message }, headers);
    } finally {
      state.aiInFlight.delete(sessionId);
    }
  };

  const server = createServer(async (request, response) => {
    const headers = corsHeaders(request, config);
    try {
      if (!allowedOrigin(request.headers.origin, config)) return sendJson(response, 403, { error: 'Origin is not allowed.' });
      if (request.method === 'OPTIONS') {
        response.writeHead(204, {
          ...headers,
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Id, X-Command-Confirmation',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Max-Age': '600',
        });
        return response.end();
      }

      const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
      if (request.method === 'GET' && url.pathname === '/health') {
        return sendJson(response, 200, {
          ok: true,
          service: 'factory-takt-industrial-gateway',
          source: state.snapshot.source,
          assets: state.snapshot.assets.length,
          generatedAt: state.snapshot.generatedAt,
          aiConfigured: Boolean(config.deepseekApiKey),
          commandsEnabled: config.allowCommands,
        }, headers);
      }
      if (request.method === 'GET' && url.pathname === '/api/industrial/snapshot') {
        return sendJson(response, 200, state.snapshot, headers);
      }
      if (request.method === 'GET' && url.pathname === '/api/industrial/stream') {
        if (state.clients.size >= config.maxSseClients) {
          return sendJson(response, 503, { error: 'Live stream client limit reached.' }, headers);
        }
        response.writeHead(200, {
          ...headers,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        response.write(`data: ${JSON.stringify(state.snapshot)}\n\n`);
        state.clients.add(response);
        request.on('close', () => state.clients.delete(response));
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/industrial/events') {
        if (isRateLimited(request, 'ingest', 240)) return sendJson(response, 429, { error: 'Ingest rate exceeded.' }, headers);
        if (!config.ingestToken) return sendJson(response, 503, { error: 'Ingest is not configured.' }, headers);
        if (!tokenMatches(config.ingestToken, request.headers.authorization)) return sendJson(response, 401, { error: 'Invalid ingest token.' }, headers);
        const next = sanitizeSnapshot(await readJsonBody(request, JSON_LIMIT));
        publish(next);
        return sendJson(response, 202, { accepted: true, sequence: next.sequence, assets: next.assets.length }, headers);
      }
      if (request.method === 'POST' && url.pathname === '/api/industrial/commands/preview') {
        if (isRateLimited(request, 'preview', 30)) return sendJson(response, 429, { error: 'Command preview rate exceeded.' }, headers);
        const body = await readJsonBody(request, 16 * 1024);
        const assetId = safeText(body.assetId, 120);
        const command = safeText(body.command, 80);
        const assetExists = state.snapshot.assets.some((asset) => asset.assetId === assetId);
        if (!assetExists) return sendJson(response, 404, { error: 'Asset is not present in the current snapshot.' }, headers);
        if (!COMMANDS.has(command)) return sendJson(response, 400, { error: 'Command is not allowlisted.' }, headers);
        if (config.commandAssets.size > 0 && !config.commandAssets.has(assetId)) return sendJson(response, 403, { error: 'Asset is not in the command allowlist.' }, headers);
        prunePreviews(Date.now(), true);
        const preview = {
          previewId: randomUUID(),
          expiresAt: new Date(Date.now() + 30_000).toISOString(),
          assetId,
          command,
          requestedValue: signalValue(body.requestedValue),
          impact: commandImpact(command),
          interlocks: ['PLC safety program remains authoritative', 'Operator authorization required', 'Preview expires after 30 seconds'],
          dryRun: !config.allowCommands,
        };
        state.previews.set(preview.previewId, preview);
        return sendJson(response, 200, preview, headers);
      }
      if (request.method === 'POST' && url.pathname === '/api/industrial/commands/execute') {
        if (!config.allowCommands) return sendJson(response, 403, { error: 'Industrial commands are disabled.' }, headers);
        if (!tokenMatches(config.operatorToken, request.headers.authorization)) return sendJson(response, 401, { error: 'Invalid operator token.' }, headers);
        const body = await readJsonBody(request, 16 * 1024);
        const previewId = safeText(body.previewId, 80);
        prunePreviews();
        const preview = state.previews.get(previewId);
        if (!preview || Date.parse(preview.expiresAt) <= Date.now()) return sendJson(response, 410, { error: 'Command preview is missing or expired.' }, headers);
        if (request.headers['x-command-confirmation'] !== `EXECUTE:${previewId}`) return sendJson(response, 409, { error: 'Exact command confirmation header is required.' }, headers);
        if (!config.mesCommandUrl) return sendJson(response, 503, { error: 'MES command adapter is not configured.' }, headers);
        state.previews.delete(previewId);
        const target = validateConfiguredUrl(config.mesCommandUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const upstream = await fetch(target, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(config.mesCommandToken ? { Authorization: `Bearer ${config.mesCommandToken}` } : {}),
            },
            body: JSON.stringify({ ...preview, approvedAt: new Date().toISOString() }),
            signal: controller.signal,
          });
          if (!upstream.ok) throw new Error(`MES command adapter rejected the request (${upstream.status}).`);
          console.info(JSON.stringify({ event: 'industrial_command_forwarded', previewId, assetId: preview.assetId, command: preview.command, at: new Date().toISOString() }));
          return sendJson(response, 202, { accepted: true, previewId }, headers);
        } finally {
          clearTimeout(timeout);
        }
      }
      if (request.method === 'POST' && url.pathname === '/api/ai/assist') return await handleAi(request, response, headers);
      return sendJson(response, 404, { error: 'Not found.' }, headers);
    } catch (error) {
      if (response.headersSent) return response.end();
      return sendJson(response, error?.statusCode ?? 500, { error: safeText(error?.message, 300) || 'Gateway request failed.' }, headers);
    }
  });

  let keepAliveTimer;
  let ignitionTimer;
  const startBackgroundTasks = () => {
    keepAliveTimer = setInterval(() => {
      for (const client of state.clients) writeStreamFrame(client, ': keep-alive\n\n');
    }, 15_000);
    if (config.ignitionSnapshotUrl) {
      const poll = async () => {
        try {
          const target = validateConfiguredUrl(config.ignitionSnapshotUrl);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), Math.min(8000, config.ignitionPollMs));
          let response;
          try {
            response = await fetch(target, {
              headers: {
                Accept: 'application/json',
                ...(config.ignitionBearerToken ? { Authorization: `Bearer ${config.ignitionBearerToken}` } : {}),
              },
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeout);
          }
          if (!response.ok) throw new Error(`Ignition snapshot request failed (${response.status}).`);
          publish(sanitizeSnapshot(await readBoundedResponseJson(response, JSON_LIMIT)));
        } catch (error) {
          console.warn(JSON.stringify({ event: 'ignition_poll_failed', message: safeText(error?.message, 240), at: new Date().toISOString() }));
        }
      };
      void poll();
      ignitionTimer = setInterval(poll, config.ignitionPollMs);
    }
  };

  const stopBackgroundTasks = () => {
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    if (ignitionTimer) clearInterval(ignitionTimer);
    for (const client of state.clients) client.end();
    state.clients.clear();
  };

  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 1000;

  return { server, state, config, publish, startBackgroundTasks, stopBackgroundTasks };
}
