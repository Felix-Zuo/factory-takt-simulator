import { createDefaultPortRule, createEmptyMetrics, createRuntime, deviceCatalog, getCatalogItem } from '../data/deviceCatalog';
import { createFlowEdgeData } from '../data/edgeDefaults';
import { nanoid } from './uid';
import type {
  AppSettings,
  DeviceRuntime,
  DeviceType,
  FactoryEdge,
  FactoryNode,
  MaterialKind,
  PanelState,
  PortMaterialFilter,
  PortRule,
  ProcessFamily,
  SavedScenarioSummary,
  FinishingMode,
} from '../types/factory';
import type { SimulationRecord } from './reporting';

export const LATEST_SCENARIO_KEY = 'factory-takt-simulator:v3';
export const SCENARIO_LIBRARY_KEY = 'factory-takt-simulator:saved-scenarios:v3';
export const REPORT_MEMORY_KEY = 'factory-takt-simulator:reports:v1';
export const MAX_SCENARIO_JSON_CHARS = 6_000_000;
export const MAX_SCENARIO_NODES = 500;
export const MAX_SCENARIO_EDGES = 2_000;

export type LegacySettingsPatch = Partial<AppSettings> & { accent?: unknown; digitalTwinScene?: unknown };

export interface ScenarioPayload {
  nodes: FactoryNode[];
  edges: FactoryEdge[];
  elapsedSec?: number;
  speed?: number;
  settings?: LegacySettingsPatch;
  panels?: Partial<PanelState>;
  savedAt?: string;
  name?: string;
}

export interface ScenarioSourceState {
  nodes: FactoryNode[];
  edges: FactoryEdge[];
  elapsedSec: number;
  speed: number;
  settings: AppSettings;
  panels: PanelState;
}

export interface SavedScenarioRecord extends ScenarioPayload {
  id: string;
  name: string;
  savedAt: string;
}

export interface ScenarioValidationResult {
  ok: boolean;
  error?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isSafeId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 160;

export const validateScenarioPayload = (value: unknown): ScenarioValidationResult => {
  if (!isRecord(value)) return { ok: false, error: 'scenario root must be an object' };

  const { nodes, edges } = value;
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return { ok: false, error: 'nodes and edges must be arrays' };
  }
  if (nodes.length === 0) return { ok: false, error: 'scenario must contain at least one node' };
  if (nodes.length > MAX_SCENARIO_NODES) {
    return { ok: false, error: `scenario exceeds ${MAX_SCENARIO_NODES} nodes` };
  }
  if (edges.length > MAX_SCENARIO_EDGES) {
    return { ok: false, error: `scenario exceeds ${MAX_SCENARIO_EDGES} edges` };
  }

  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!isRecord(node) || !isSafeId(node.id)) return { ok: false, error: 'every node needs a valid id' };
    if (nodeIds.has(node.id)) return { ok: false, error: `duplicate node id: ${node.id}` };
    if (node.type !== undefined && node.type !== 'deviceNode') {
      return { ok: false, error: `unsupported node type: ${String(node.type)}` };
    }
    if (!isRecord(node.position) || !isFiniteNumber(node.position.x) || !isFiniteNumber(node.position.y)) {
      return { ok: false, error: `node ${node.id} has an invalid position` };
    }
    if (Math.abs(node.position.x) > 1_000_000 || Math.abs(node.position.y) > 1_000_000) {
      return { ok: false, error: `node ${node.id} is outside the supported canvas range` };
    }
    if (!isRecord(node.data) || !isRecord(node.data.params)) {
      return { ok: false, error: `node ${node.id} is missing parameter data` };
    }
    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (!isRecord(edge) || !isSafeId(edge.id) || !isSafeId(edge.source) || !isSafeId(edge.target)) {
      return { ok: false, error: 'every edge needs valid id, source, and target fields' };
    }
    if (edgeIds.has(edge.id)) return { ok: false, error: `duplicate edge id: ${edge.id}` };
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return { ok: false, error: `edge ${edge.id} references an unknown node` };
    }
    if (edge.type !== undefined && edge.type !== 'flowEdge') {
      return { ok: false, error: `unsupported edge type: ${String(edge.type)}` };
    }
    if (!isRecord(edge.data)) return { ok: false, error: `edge ${edge.id} is missing flow data` };
    edgeIds.add(edge.id);
  }

  if (value.elapsedSec !== undefined && (!isFiniteNumber(value.elapsedSec) || value.elapsedSec < 0)) {
    return { ok: false, error: 'elapsedSec must be a non-negative finite number' };
  }
  if (value.speed !== undefined && (!isFiniteNumber(value.speed) || value.speed <= 0 || value.speed > 500)) {
    return { ok: false, error: 'speed must be a finite number between 0 and 500' };
  }
  if (value.settings !== undefined && !isRecord(value.settings)) {
    return { ok: false, error: 'settings must be an object' };
  }
  if (value.panels !== undefined && !isRecord(value.panels)) {
    return { ok: false, error: 'panels must be an object' };
  }

  return { ok: true };
};

export const sanitizeSettingsPatch = (settings?: LegacySettingsPatch): Partial<AppSettings> => {
  if (!isRecord(settings)) return {};
  const patch: Partial<AppSettings> = {};
  if (settings.language === 'zh-CN' || settings.language === 'en') patch.language = settings.language;
  if (settings.themeMode === 'dark' || settings.themeMode === 'light') patch.themeMode = settings.themeMode;
  if (settings.animationIntensity === 'off' || settings.animationIntensity === 'low' || settings.animationIntensity === 'standard' || settings.animationIntensity === 'showcase') {
    patch.animationIntensity = settings.animationIntensity;
  }
  if (settings.cardDensity === 'compact' || settings.cardDensity === 'standard') patch.cardDensity = settings.cardDensity;
  if (typeof settings.snapToGrid === 'boolean') patch.snapToGrid = settings.snapToGrid;
  if (typeof settings.hideText === 'boolean') patch.hideText = settings.hideText;
  if (settings.simulationTargetMode === 'time' || settings.simulationTargetMode === 'output') {
    patch.simulationTargetMode = settings.simulationTargetMode;
  }
  if (isFiniteNumber(settings.simulationTargetHours) && settings.simulationTargetHours > 0 && settings.simulationTargetHours <= 8_760) {
    patch.simulationTargetHours = settings.simulationTargetHours;
  }
  if (isFiniteNumber(settings.simulationTargetOutput) && settings.simulationTargetOutput > 0 && settings.simulationTargetOutput <= 1_000_000_000) {
    patch.simulationTargetOutput = settings.simulationTargetOutput;
  }
  if (isFiniteNumber(settings.backgroundStepSec) && settings.backgroundStepSec >= 0.05 && settings.backgroundStepSec <= 60) {
    patch.backgroundStepSec = settings.backgroundStepSec;
  }
  return patch;
};

export const sanitizePanelsPatch = (panels?: Partial<PanelState>): Partial<PanelState> => {
  if (!isRecord(panels)) return {};
  const patch: Partial<PanelState> = {};
  const booleanKeys = ['leftCollapsed', 'rightCollapsed', 'bottomCollapsed', 'taktCollapsed', 'logCollapsed'] as const;
  for (const key of booleanKeys) {
    if (typeof panels[key] === 'boolean') patch[key] = panels[key];
  }
  if (isFiniteNumber(panels.leftWidth)) patch.leftWidth = Math.max(180, Math.min(420, panels.leftWidth));
  if (isFiniteNumber(panels.rightWidth)) patch.rightWidth = Math.max(260, Math.min(560, panels.rightWidth));
  if (isFiniteNumber(panels.bottomHeight)) patch.bottomHeight = Math.max(140, Math.min(460, panels.bottomHeight));
  return patch;
};

const migrateFinishingMode = (mode: unknown): FinishingMode => {
  if (mode === 'parallel_once' || mode === 'serial_twice' || mode === 'single_station_once') return mode;
  if (mode === 'double') return 'serial_twice';
  return 'single_station_once';
};

const legacyDeviceTypes: Record<string, DeviceType> = {
  assembly_storage: 'merge_buffer',
  assembly_cleaner: 'wash_dry',
  eddy_check: 'inspection_a',
  dimension_check: 'inspection_b',
  pairing_station: 'join_station',
  riveting_station: 'fasten_station',
  flexibility_check: 'functional_check',
  vibration_check: 'performance_check',
  grease_injection: 'fill_station',
  cap_press: 'press_station',
  visual_check: 'visual_inspection',
  rust_proof: 'surface_treatment',
  or_grinder: 'process_a',
  ir_grinder: 'process_b',
  bore_grinder: 'process_c',
  superfinishing: 'finishing',
  small_superfinishing: 'finishing_b',
  or_gauge: 'qa_a',
  ir_gauge: 'qa_b',
  bore_gauge: 'qa_c',
  sf_check: 'final_qa',
  general_gauge: 'general_inspection',
};

const validDeviceTypes = new Set(deviceCatalog.map((item) => item.type));

const normalizeDeviceType = (value: unknown): DeviceType => {
  const key = String(value ?? '');
  if (key in legacyDeviceTypes) return legacyDeviceTypes[key];
  if (validDeviceTypes.has(key as DeviceType)) return key as DeviceType;
  return 'general_inspection';
};

const normalizeMaterialKind = (value: unknown, fallback: MaterialKind = 'mixed'): MaterialKind => {
  if (value === 'part_a' || value === 'big_ring') return 'part_a';
  if (value === 'part_b' || value === 'small_ring') return 'part_b';
  if (value === 'mixed') return 'mixed';
  return fallback;
};

const normalizeMaterialFilter = (value: unknown, fallback: PortMaterialFilter): PortMaterialFilter => {
  if (value === 'any') return 'any';
  return normalizeMaterialKind(value, fallback === 'any' ? 'mixed' : fallback);
};

const normalizeProcessFamily = (value: unknown, fallback: ProcessFamily): ProcessFamily => {
  if (value === 'grinding') return 'processing';
  if (value === 'gauge') return 'inspection';
  if (value === 'superfinishing') return 'finishing';
  return typeof value === 'string' ? (value as ProcessFamily) : fallback;
};

const ensurePortRules = (
  existing: Record<string, PortRule> | undefined,
  side: 'input' | 'output',
  count: number,
  materialForIndex: (index: number) => PortRule['materialFilter'],
) => {
  const rules: Record<string, PortRule> = {};
  for (let index = 1; index <= Math.max(1, Math.min(4, count)); index += 1) {
    const handleId = `${side === 'input' ? 'in' : 'out'}-${index}`;
    const base = createDefaultPortRule(side, index, materialForIndex(index));
    rules[handleId] = {
      ...base,
      ...(existing?.[handleId] ?? {}),
      materialFilter: normalizeMaterialFilter(existing?.[handleId]?.materialFilter, materialForIndex(index)),
    };
  }
  return rules;
};

const hydrateNodeParams = (node: FactoryNode) => {
  const rawParams = node.data.params as typeof node.data.params & Record<string, unknown>;
  const deviceType = normalizeDeviceType(rawParams.deviceType);
  const defaults = getCatalogItem(deviceType).defaultParams;
  const params = {
    ...defaults,
    ...rawParams,
    deviceType,
    processFamily: normalizeProcessFamily(rawParams.processFamily, defaults.processFamily),
    materialKind: normalizeMaterialKind(rawParams.materialKind, defaults.materialKind),
    output1MaterialKind: normalizeMaterialKind(rawParams.output1MaterialKind, defaults.output1MaterialKind),
    output2MaterialKind: normalizeMaterialKind(rawParams.output2MaterialKind, defaults.output2MaterialKind),
    taktMode: rawParams.taktMode ?? 'calculated',
    manualTaktSec: rawParams.manualTaktSec ?? rawParams.processTimeSec ?? defaults.manualTaktSec,
    finishingMode: migrateFinishingMode(rawParams.finishingMode ?? rawParams.superfinishingMode),
    partAStorageCapacity: rawParams.partAStorageCapacity ?? rawParams.assemblyBigStorageCapacity ?? defaults.partAStorageCapacity,
    partAStorageCount: rawParams.partAStorageCount ?? rawParams.assemblyBigStorageCount ?? defaults.partAStorageCount,
    partBStorageCapacity: rawParams.partBStorageCapacity ?? rawParams.assemblySmallStorageCapacity ?? defaults.partBStorageCapacity,
    partBStorageCount: rawParams.partBStorageCount ?? rawParams.assemblySmallStorageCount ?? defaults.partBStorageCount,
  };
  params.inputPortRules = ensurePortRules(
    params.inputPortRules,
    'input',
    params.inputPortCount,
    () => params.materialKind ?? 'mixed',
  );
  params.outputPortRules = ensurePortRules(
    params.outputPortRules,
    'output',
    params.outputPortCount,
    (index) =>
      index === 2
        ? (params.output2MaterialKind ?? params.materialKind ?? 'mixed')
        : (params.output1MaterialKind ?? params.materialKind ?? 'mixed'),
  );
  return params;
};

export const hydrateScenarioNode = (node: FactoryNode): FactoryNode => {
  const params = hydrateNodeParams(node);
  const legacyRuntime = node.data.runtime as Partial<DeviceRuntime> | undefined;
  const status = params.enabled ? (legacyRuntime?.status ?? 'idle') : 'stopped';

  return {
    ...node,
    data: {
      ...node.data,
      label: params.deviceShortName,
      params,
      metrics: {
        ...createEmptyMetrics(params),
        ...node.data.metrics,
      },
      runtime: {
        ...createRuntime(status),
        ...legacyRuntime,
        status,
        qualityCarry: legacyRuntime?.qualityCarry ?? 0,
      },
    },
  };
};

export const hydrateScenarioEdge = (edge: FactoryEdge): FactoryEdge => ({
  ...edge,
  data: edge.data
    ? {
        ...createFlowEdgeData(edge.data.label, edge.data.transportType),
        ...edge.data,
        lineBufferCapacity: edge.data.lineBufferCapacity ?? 12,
        lineBufferCount: edge.data.lineBufferCount ?? 0,
      }
    : edge.data,
});

export const hydrateScenarioPayload = (
  payload: ScenarioPayload,
  currentSettings: AppSettings,
  currentPanels: PanelState,
  defaultSettings: AppSettings,
  defaultPanels: PanelState,
) => {
  const nodes = (payload.nodes ?? []).map(hydrateScenarioNode);
  const edges = (payload.edges ?? []).map(hydrateScenarioEdge);
  return {
    nodes,
    edges,
    elapsedSec: payload.elapsedSec ?? 0,
    speed: payload.speed ?? 1,
    settings: { ...defaultSettings, ...currentSettings, ...sanitizeSettingsPatch(payload.settings) },
    panels: { ...defaultPanels, ...currentPanels, ...sanitizePanelsPatch(payload.panels) },
  };
};

export const createScenarioPayloadFromState = (state: ScenarioSourceState): ScenarioPayload => ({
  nodes: state.nodes,
  edges: state.edges,
  elapsedSec: state.elapsedSec,
  speed: state.speed,
  settings: state.settings,
  panels: state.panels,
  savedAt: new Date().toISOString(),
});

export const createSavedScenarioRecord = (state: ScenarioSourceState, name?: string): SavedScenarioRecord => {
  const savedAt = new Date().toISOString();
  const scenarioName =
    typeof name === 'string' && name.trim()
      ? name.trim()
      : `Scenario ${new Date().toLocaleString()}`;
  return {
    id: `scenario-${nanoid()}`,
    name: scenarioName,
    ...createScenarioPayloadFromState(state),
    savedAt,
  };
};

export const createImportedScenarioRecord = (payload: ScenarioPayload, name?: string): SavedScenarioRecord => ({
  ...payload,
  id: `scenario-${nanoid()}`,
  name: name?.trim() || payload.name || `Imported ${new Date().toLocaleString()}`,
  settings: sanitizeSettingsPatch(payload.settings),
  panels: sanitizePanelsPatch(payload.panels),
  savedAt: new Date().toISOString(),
});

export const summarizeSavedScenario = (scenario: SavedScenarioRecord): SavedScenarioSummary => ({
  id: scenario.id,
  name: scenario.name,
  savedAt: scenario.savedAt,
  nodeCount: scenario.nodes?.length ?? 0,
  edgeCount: scenario.edges?.length ?? 0,
  elapsedSec: scenario.elapsedSec ?? 0,
});

export const readSavedScenarioRecords = (): SavedScenarioRecord[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCENARIO_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedScenarioRecord[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.id && validateScenarioPayload(item).ok)
      : [];
  } catch {
    return [];
  }
};

export const writeSavedScenarioRecords = (scenarios: SavedScenarioRecord[]) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SCENARIO_LIBRARY_KEY, JSON.stringify(scenarios));
};

export const putScenarioRecord = (scenario: SavedScenarioRecord, maxRecords = 60) => {
  const records = [scenario, ...readSavedScenarioRecords().filter((item) => item.id !== scenario.id)].slice(0, maxRecords);
  writeSavedScenarioRecords(records);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LATEST_SCENARIO_KEY, JSON.stringify(scenario));
  }
};

export const persistLatestScenarioState = (state: ScenarioSourceState) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    LATEST_SCENARIO_KEY,
    JSON.stringify({
      ...createScenarioPayloadFromState(state),
      name: 'Auto recovered workspace',
    }),
  );
};

export const findScenarioPayload = (scenarioId?: string): ScenarioPayload | null => {
  if (scenarioId) {
    return readSavedScenarioRecords().find((scenario) => scenario.id === scenarioId) ?? null;
  }

  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LATEST_SCENARIO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (validateScenarioPayload(parsed).ok) return parsed as ScenarioPayload;
      localStorage.removeItem(LATEST_SCENARIO_KEY);
    }
  } catch {
    localStorage.removeItem(LATEST_SCENARIO_KEY);
  }

  return readSavedScenarioRecords()[0] ?? null;
};

export const deleteScenarioRecord = (scenarioId: string) => {
  writeSavedScenarioRecords(readSavedScenarioRecords().filter((scenario) => scenario.id !== scenarioId));
};

export const readReportMemory = (): { records: SimulationRecord[]; latestReport: string } => {
  if (typeof localStorage === 'undefined') return { records: [], latestReport: '' };
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORT_MEMORY_KEY) || '{}') as {
      records?: SimulationRecord[];
      latestReport?: string;
    };
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      latestReport: typeof parsed.latestReport === 'string' ? parsed.latestReport : '',
    };
  } catch {
    return { records: [], latestReport: '' };
  }
};

export const writeReportMemory = (records: SimulationRecord[], latestReport: string) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(REPORT_MEMORY_KEY, JSON.stringify({ records: records.slice(0, 40), latestReport }));
};
