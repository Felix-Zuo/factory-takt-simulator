import type {
  AiAssistantMode,
  AiAssistantResult,
  IndustrialCommandPreview,
  IndustrialSnapshot,
} from '../../types/industrial';

const MAX_ASSETS = 500;
const MAX_ALARMS = 1000;
const MAX_SIGNALS = 64;
const SNAPSHOT_RESPONSE_LIMIT = 512 * 1024;
const AI_RESPONSE_LIMIT = 96 * 1024;
const SMALL_RESPONSE_LIMIT = 32 * 1024;

const SOURCE_VALUES = new Set(['demo', 'gateway', 'ignition', 'sparkplug', 'mes-rest', 'generic']);
const PLC_MODES = new Set(['auto', 'manual', 'maintenance', 'offline']);
const ACTION_NAMES = new Set(['idle', 'waiting', 'load', 'clamp', 'process', 'inspect', 'transfer', 'unload', 'hold', 'service', 'fault']);
const QUALITY_VALUES = new Set(['good', 'uncertain', 'bad']);
const ACTUATOR_KINDS = new Set(['solenoid', 'motor', 'servo', 'relay']);
const ALARM_SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'info']);
const ALARM_STATES = new Set(['active', 'acknowledged', 'cleared']);
const AI_ACTIONS = new Set(['focus_node', 'pause_simulation', 'start_simulation', 'set_simulation_speed', 'set_process_time', 'run_background_analysis']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isSignalValue = (value: unknown) => isString(value) || typeof value === 'boolean' || isFiniteNumber(value);

const validateSignal = (value: unknown) => {
  if (!isRecord(value)) return false;
  return isString(value.id)
    && isString(value.label)
    && isString(value.tagPath)
    && isSignalValue(value.value)
    && (value.unit === undefined || isString(value.unit))
    && QUALITY_VALUES.has(String(value.quality))
    && isString(value.updatedAt);
};

const validateActuator = (value: unknown) => {
  if (!isRecord(value)) return false;
  return isString(value.id)
    && isString(value.label)
    && isString(value.tagPath)
    && ACTUATOR_KINDS.has(String(value.kind))
    && isSignalValue(value.command)
    && isSignalValue(value.feedback)
    && typeof value.interlocked === 'boolean'
    && QUALITY_VALUES.has(String(value.quality))
    && isString(value.updatedAt);
};

const validateAsset = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.plc) || !isRecord(value.action)) return false;
  if (!Array.isArray(value.sensors) || value.sensors.length > MAX_SIGNALS || !value.sensors.every(validateSignal)) return false;
  if (!Array.isArray(value.actuators) || value.actuators.length > MAX_SIGNALS || !value.actuators.every(validateActuator)) return false;
  const plc = value.plc;
  const action = value.action;
  return isString(value.assetId)
    && isString(value.nodeId)
    && isString(value.displayName)
    && isString(value.equipmentPath)
    && SOURCE_VALUES.has(String(value.source))
    && PLC_MODES.has(String(plc.mode))
    && typeof plc.run === 'boolean'
    && typeof plc.ready === 'boolean'
    && typeof plc.fault === 'boolean'
    && isFiniteNumber(plc.heartbeat)
    && isString(plc.programState)
    && ACTION_NAMES.has(String(action.name))
    && isFiniteNumber(action.progress)
    && action.progress >= 0
    && action.progress <= 1
    && isString(action.cycleId)
    && (action.startedAt === null || isString(action.startedAt))
    && isFiniteNumber(value.cycleCount)
    && isFiniteNumber(value.goodCount)
    && isFiniteNumber(value.rejectCount)
    && isString(value.lastUpdated);
};

const validateAlarm = (value: unknown) => {
  if (!isRecord(value)) return false;
  return isString(value.id)
    && isString(value.assetId)
    && isString(value.code)
    && isString(value.title)
    && isString(value.message)
    && ALARM_SEVERITIES.has(String(value.severity))
    && ALARM_STATES.has(String(value.state))
    && isString(value.source)
    && isString(value.occurredAt)
    && (value.acknowledgedAt === undefined || isString(value.acknowledgedAt))
    && (value.clearedAt === undefined || isString(value.clearedAt));
};

export const normalizeGatewayUrl = (value: string) => {
  const url = new URL(value.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Gateway URL must use HTTP or HTTPS.');
  if (url.username || url.password) throw new Error('Gateway URL must not contain credentials.');
  if (url.search || url.hash) throw new Error('Gateway URL must not contain a query or fragment.');
  const pathname = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${pathname}`;
};

export const parseIndustrialSnapshot = (value: unknown): IndustrialSnapshot => {
  if (!isRecord(value) || value.schemaVersion !== '1.0') throw new Error('Unsupported industrial snapshot schema.');
  if (!SOURCE_VALUES.has(String(value.source))) throw new Error('Invalid industrial snapshot source.');
  if (!isString(value.generatedAt) || !isFiniteNumber(value.sequence) || value.sequence < 0) throw new Error('Invalid snapshot metadata.');
  if (!Array.isArray(value.assets) || value.assets.length > MAX_ASSETS || !value.assets.every(validateAsset)) throw new Error('Invalid asset collection.');
  if (!Array.isArray(value.alarms) || value.alarms.length > MAX_ALARMS || !value.alarms.every(validateAlarm)) throw new Error('Invalid alarm collection.');
  const assetIds = new Set(value.assets.map((asset) => (asset as Record<string, unknown>).assetId));
  if (assetIds.size !== value.assets.length) throw new Error('Industrial snapshot contains duplicate assets.');
  if (value.alarms.some((alarm) => !assetIds.has((alarm as Record<string, unknown>).assetId))) throw new Error('Industrial alarm references an unknown asset.');
  return value as unknown as IndustrialSnapshot;
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  let timedOut = false;
  const sourceSignal = init.signal;
  const abortFromSource = () => controller.abort(sourceSignal?.reason);
  if (sourceSignal?.aborted) abortFromSource();
  else sourceSignal?.addEventListener('abort', abortFromSource, { once: true });
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new Error('Gateway request timed out.', { cause: error });
    throw error;
  } finally {
    window.clearTimeout(timeout);
    sourceSignal?.removeEventListener('abort', abortFromSource);
  }
};

const parseJsonResponse = async (response: Response, limit: number): Promise<unknown> => {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > limit) throw new Error('Gateway response is too large.');
  const text = await response.text();
  if (text.length > limit) throw new Error('Gateway response is too large.');
  let payload: unknown;
  try {
    payload = JSON.parse(text || '{}');
  } catch {
    throw new Error('Gateway response is not valid JSON.');
  }
  if (!response.ok) {
    const errorMessage = isRecord(payload) && isString(payload.error) ? payload.error : `Gateway request failed (${response.status}).`;
    throw new Error(errorMessage);
  }
  return payload;
};

export const fetchIndustrialSnapshot = async (gatewayUrl: string, signal?: AbortSignal) => {
  const response = await fetchWithTimeout(`${normalizeGatewayUrl(gatewayUrl)}/api/industrial/snapshot`, {
    headers: { Accept: 'application/json' },
    signal,
  }, 8000);
  return parseIndustrialSnapshot(await parseJsonResponse(response, SNAPSHOT_RESPONSE_LIMIT));
};

export interface AiAssistanceRequest {
  mode: AiAssistantMode;
  question: string;
  language: 'zh-CN' | 'en';
  report: string;
  context: Record<string, unknown>;
  sessionId: string;
}

const parseAiAssistantResult = (value: unknown): AiAssistantResult => {
  if (!isRecord(value)
    || !isString(value.answer)
    || !Array.isArray(value.evidence)
    || !value.evidence.every(isString)
    || !Array.isArray(value.assumptions)
    || !value.assumptions.every(isString)
    || !Array.isArray(value.actions)
    || !['low', 'medium', 'high'].includes(String(value.confidence))
    || !['deepseek-v4-flash', 'local-rules'].includes(String(value.source))
    || typeof value.cached !== 'boolean'
    || !isRecord(value.usage)) {
    throw new Error('AI response does not match the bounded assistant contract.');
  }
  const actionsValid = value.actions.every((action) => isRecord(action)
    && AI_ACTIONS.has(String(action.type))
    && isString(action.label)
    && isString(action.reason)
    && (action.targetId === undefined || isString(action.targetId))
    && (action.value === undefined || isFiniteNumber(action.value)));
  const usage = value.usage;
  const usageValid = isFiniteNumber(usage.promptTokens)
    && isFiniteNumber(usage.completionTokens)
    && isFiniteNumber(usage.totalTokens)
    && (usage.remainingDailyTokens === null || isFiniteNumber(usage.remainingDailyTokens));
  if (!actionsValid || !usageValid) throw new Error('AI response does not match the bounded assistant contract.');
  return value as unknown as AiAssistantResult;
};

export const requestAiAssistance = async (gatewayUrl: string, request: AiAssistanceRequest) => {
  const response = await fetchWithTimeout(`${normalizeGatewayUrl(gatewayUrl)}/api/ai/assist`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Session-Id': request.sessionId,
    },
    body: JSON.stringify(request),
  }, 45_000);
  return parseAiAssistantResult(await parseJsonResponse(response, AI_RESPONSE_LIMIT));
};

const parseCommandPreview = (value: unknown): IndustrialCommandPreview => {
  if (!isRecord(value)
    || !isString(value.previewId)
    || !isString(value.expiresAt)
    || !isString(value.assetId)
    || !['request_hold', 'request_resume', 'acknowledge_alarm', 'reset_fault'].includes(String(value.command))
    || !isSignalValue(value.requestedValue)
    || !isString(value.impact)
    || !Array.isArray(value.interlocks)
    || !value.interlocks.every(isString)
    || typeof value.dryRun !== 'boolean') {
    throw new Error('Command preview does not match the gateway contract.');
  }
  return value as unknown as IndustrialCommandPreview;
};

export const previewIndustrialCommand = async (
  gatewayUrl: string,
  request: Omit<IndustrialCommandPreview, 'previewId' | 'expiresAt' | 'impact' | 'interlocks' | 'dryRun'>,
) => {
  const response = await fetchWithTimeout(`${normalizeGatewayUrl(gatewayUrl)}/api/industrial/commands/preview`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }, 8000);
  return parseCommandPreview(await parseJsonResponse(response, SMALL_RESPONSE_LIMIT));
};
