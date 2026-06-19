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

export const sanitizeSettingsPatch = (settings?: LegacySettingsPatch): Partial<AppSettings> => {
  if (!settings) return {};
  const { accent: _discardAccent, digitalTwinScene: _discardDigitalTwinScene, ...rest } = settings;
  void _discardAccent;
  void _discardDigitalTwinScene;
  return rest;
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
    panels: { ...defaultPanels, ...currentPanels, ...(payload.panels ?? {}) },
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
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && Array.isArray(item.nodes) && Array.isArray(item.edges)) : [];
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
    if (raw) return JSON.parse(raw) as ScenarioPayload;
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
