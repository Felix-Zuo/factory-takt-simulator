import { createDefaultPortRule, createEmptyMetrics, createRuntime, getCatalogItem } from '../data/deviceCatalog';
import { createFlowEdgeData } from '../data/edgeDefaults';
import { nanoid } from './uid';
import type {
  AppSettings,
  DeviceRuntime,
  FactoryEdge,
  FactoryNode,
  PanelState,
  PortRule,
  SavedScenarioSummary,
  SuperfinishingMode,
} from '../types/factory';
import type { SimulationRecord } from './reporting';

export const LATEST_SCENARIO_KEY = 'factory-takt-simulator:v2';
export const SCENARIO_LIBRARY_KEY = 'factory-takt-simulator:saved-scenarios:v2';
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

const migrateSuperfinishingMode = (mode: unknown): SuperfinishingMode => {
  if (mode === 'parallel_once' || mode === 'serial_twice' || mode === 'single_station_once') return mode;
  if (mode === 'double') return 'serial_twice';
  return 'single_station_once';
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
      materialFilter: existing?.[handleId]?.materialFilter ?? materialForIndex(index),
    };
  }
  return rules;
};

const hydrateNodeParams = (node: FactoryNode) => {
  const defaults = getCatalogItem(node.data.params.deviceType).defaultParams;
  const params = {
    ...defaults,
    ...node.data.params,
    taktMode: node.data.params.taktMode ?? 'calculated',
    manualTaktSec: node.data.params.manualTaktSec ?? node.data.params.processTimeSec ?? defaults.manualTaktSec,
    superfinishingMode: migrateSuperfinishingMode(node.data.params.superfinishingMode),
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
