import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange, type XYPosition } from '@xyflow/react';
import { create } from 'zustand';
import { buildSimulationSummary } from '../lib/analysis';
import { createFlowEdgeData } from '../data/edgeDefaults';
import { SETTINGS_KEY, defaultPanels, defaultSettings } from '../data/defaultState';
import { applyConfigBrushToTarget as applyConfigBrushToTargetNodes, configBrushLabel, type ConfigBrushMode } from '../lib/configBrush';
import { applyNodeParamUpdate } from '../lib/nodeParamUpdate';
import { mergeNodeParams } from '../lib/nodeConfig';
import {
  buildSimulationReport,
  downloadText,
  finishedOutput,
  recordsToCsv,
  type SimulationRecord,
} from '../lib/reporting';
import {
  appendHistory,
  createHistorySnapshot,
  isRouteOnlyEdgePatch,
  restoreHistorySnapshot,
  shouldRecordEdgeChanges,
  shouldRecordNodeChanges,
  type FactoryHistorySnapshot,
} from '../lib/factoryHistory';
import {
  buildPortRulePatch,
  canConnectByMaterial,
  getPortRule,
} from '../lib/portRules';
import { resetNodeForSimulation } from '../lib/simulationReset';
import {
  createImportedScenarioRecord,
  createSavedScenarioRecord,
  deleteScenarioRecord,
  findScenarioPayload,
  hydrateScenarioPayload,
  putScenarioRecord,
  readSavedScenarioRecords,
  sanitizeSettingsPatch,
  summarizeSavedScenario,
  type LegacySettingsPatch,
  type SavedScenarioRecord,
  type ScenarioPayload,
} from '../lib/scenarioPersistence';
import { tickSimulation } from '../lib/simulation';
import { nanoid } from '../lib/uid';
import { createDefaultPortRule, createEmptyMetrics, createNodeData, createRuntime, getCatalogItem } from '../data/deviceCatalog';
import type {
  AppSettings,
  DeviceParameters,
  DeviceType,
  FactoryEdge,
  FactoryNode,
  FlowEdgeData,
  PanelState,
  PortRule,
  SelectedPort,
  SavedScenarioSummary,
  SimulationSummary,
  TransportType,
} from '../types/factory';

const DEFAULT_TEMPLATE_SUPPLY = 250000;

const completePortRules = (params: DeviceParameters): DeviceParameters => {
  const inputPortRules = { ...params.inputPortRules };
  for (let index = 1; index <= Math.max(1, Math.min(4, params.inputPortCount)); index += 1) {
    const handleId = `in-${index}`;
    if (!inputPortRules[handleId]) inputPortRules[handleId] = createDefaultPortRule('input', index, params.materialKind);
  }

  const outputPortRules = { ...params.outputPortRules };
  for (let index = 1; index <= Math.max(1, Math.min(4, params.outputPortCount)); index += 1) {
    const handleId = `out-${index}`;
    const materialFilter = index === 2 ? params.output2MaterialKind : params.output1MaterialKind;
    outputPortRules[handleId] = {
      ...createDefaultPortRule('output', index, materialFilter),
      ...(outputPortRules[handleId] ?? {}),
      materialFilter,
    };
  }

  return { ...params, inputPortRules, outputPortRules };
};

interface FactoryState {
  nodes: FactoryNode[];
  edges: FactoryEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedPort: SelectedPort | null;
  pendingConnectFrom: { nodeId: string; handleId: string } | null;
  pendingConfigBrush: { sourceNodeId: string; mode: ConfigBrushMode } | null;
  isRunning: boolean;
  speed: number;
  elapsedSec: number;
  summary: SimulationSummary;
  settings: AppSettings;
  panels: PanelState;
  logs: string[];
  records: SimulationRecord[];
  latestReport: string;
  historyPast: FactoryHistorySnapshot[];
  historyFuture: FactoryHistorySnapshot[];
  addDevice: (type: DeviceType, position: XYPosition) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  onNodesChange: (changes: NodeChange<FactoryNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FactoryEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  beginClickConnect: (sourceNodeId: string, sourceHandle?: string) => void;
  completeClickConnect: (targetNodeId: string, targetHandle?: string) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  selectPort: (port: SelectedPort | null) => void;
  updateNodeParams: (nodeId: string, patch: Partial<DeviceParameters>) => void;
  updatePortRule: (nodeId: string, side: SelectedPort['side'], handleId: string, patch: Partial<PortRule>) => void;
  updateEdgeData: (edgeId: string, patch: Partial<FlowEdgeData>) => void;
  setPanelSize: (panel: 'leftWidth' | 'rightWidth' | 'bottomHeight', value: number) => void;
  start: () => void;
  pause: () => void;
  resetSimulation: () => void;
  setSpeed: (speed: number) => void;
  tick: (dt: number) => void;
  captureRecord: () => void;
  exportScenario: () => void;
  exportLatestReport: () => void;
  exportRecords: () => void;
  runBackgroundSimulation: () => void;
  saveScenario: (name?: string) => string;
  listSavedScenarios: () => SavedScenarioSummary[];
  loadScenario: (scenarioId?: string) => boolean;
  deleteSavedScenario: (scenarioId: string) => void;
  importScenarioJson: (json: string, name?: string) => boolean;
  bootstrapScenario: (fallback: ScenarioPayload) => void;
  startConfigBrush: (sourceNodeId: string, mode: ConfigBrushMode) => void;
  cancelConfigBrush: () => void;
  applyConfigBrushToTarget: (targetNodeId: string) => number;
  createDemoScenario: () => void;
  createFullLineScenario: () => void;
  createAssemblyScenario: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  togglePanel: (panel: keyof PanelState) => void;
  undo: () => void;
  redo: () => void;
  addLog: (message: string) => void;
}

const createEdgeFromConnection = (
  connection: Connection | { source: string; target: string; sourceHandle?: string; targetHandle?: string },
  transportType: TransportType = 'conveyor',
): FactoryEdge => ({
  id: `edge-${connection.source}-${connection.target}-${nanoid()}`,
  source: connection.source ?? '',
  target: connection.target ?? '',
  sourceHandle: connection.sourceHandle ?? 'out-1',
  targetHandle: connection.targetHandle ?? 'in-1',
  type: 'flowEdge',
  animated: true,
  data: createFlowEdgeData(transportType === 'loader_arm' ? 'Loader Arm' : 'Conveyor', transportType),
});

const withSummary = (nodes: FactoryNode[], edges: FactoryEdge[], elapsedSec: number) =>
  buildSimulationSummary(nodes, edges, elapsedSec);

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(2)}h`;

const scenarioStatePatch = (payload: ScenarioPayload, state: FactoryState, logMessage: string) => {
  const hydrated = hydrateScenarioPayload(payload, state.settings, state.panels, defaultSettings, defaultPanels);
  return {
    ...hydrated,
    isRunning: false,
    selectedNodeId: null,
    selectedEdgeId: null,
    selectedPort: null,
    pendingConnectFrom: null,
    pendingConfigBrush: null,
    summary: withSummary(hydrated.nodes, hydrated.edges, hydrated.elapsedSec),
    logs: [logMessage, ...state.logs].slice(0, 80),
  };
};

const safeLoadSettings = (): AppSettings => {
  if (typeof localStorage === 'undefined') return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as LegacySettingsPatch;
    return { ...defaultSettings, ...sanitizeSettingsPatch(parsed) };
  } catch {
    return defaultSettings;
  }
};

const initialSummary = withSummary([], [], 0);

const historyPatch = (state: FactoryState) => ({
  historyPast: appendHistory(state.historyPast, createHistorySnapshot(state)),
  historyFuture: [],
});

export const useFactoryStore = create<FactoryState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedPort: null,
  pendingConnectFrom: null,
  pendingConfigBrush: null,
  isRunning: false,
  speed: 1,
  elapsedSec: 0,
  summary: initialSummary,
  settings: safeLoadSettings(),
  panels: defaultPanels,
  logs: ['Round 2 simulator ready.'],
  records: [],
  latestReport: '',
  historyPast: [],
  historyFuture: [],

  addDevice: (type, position) => {
    const nodeIndex = get().nodes.length + 1;
    const data = createNodeData(type, nodeIndex);
    const node: FactoryNode = {
      id: `node-${type}-${nanoid()}`,
      type: 'deviceNode',
      position,
      data,
    };

    set((state) => {
      const nodes = [...state.nodes, node];
      return {
        ...historyPatch(state),
        nodes,
        selectedNodeId: node.id,
        selectedEdgeId: null,
        selectedPort: null,
        summary: withSummary(nodes, state.edges, state.elapsedSec),
        logs: [`Added ${data.params.deviceShortName} at x=${Math.round(position.x)}, y=${Math.round(position.y)}.`, ...state.logs].slice(0, 80),
      };
    });
  },

  deleteNode: (nodeId) => {
    set((state) => {
      const nodes = state.nodes.filter((node) => node.id !== nodeId);
      const edges = state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
      return {
        ...historyPatch(state),
        nodes,
        edges,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        selectedEdgeId: state.selectedEdgeId && edges.some((edge) => edge.id === state.selectedEdgeId) ? state.selectedEdgeId : null,
        selectedPort: state.selectedPort?.nodeId === nodeId ? null : state.selectedPort,
        pendingConnectFrom: state.pendingConnectFrom?.nodeId === nodeId ? null : state.pendingConnectFrom,
        pendingConfigBrush: state.pendingConfigBrush?.sourceNodeId === nodeId ? null : state.pendingConfigBrush,
        summary: withSummary(nodes, edges, state.elapsedSec),
        logs: [`Deleted node ${nodeId}.`, ...state.logs].slice(0, 80),
      };
    });
  },

  deleteEdge: (edgeId) => {
    set((state) => {
      const edges = state.edges.filter((edge) => edge.id !== edgeId);
      return {
        ...historyPatch(state),
        edges,
        selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
        summary: withSummary(state.nodes, edges, state.elapsedSec),
        logs: [`Deleted edge ${edgeId}.`, ...state.logs].slice(0, 80),
      };
    });
  },

  onNodesChange: (changes) => {
    set((state) => {
      const nodes = applyNodeChanges(changes, state.nodes);
      return {
        ...(shouldRecordNodeChanges(changes) ? historyPatch(state) : {}),
        nodes,
        summary: withSummary(nodes, state.edges, state.elapsedSec),
      };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges);
      return {
        ...(shouldRecordEdgeChanges(changes) ? historyPatch(state) : {}),
        edges,
        summary: withSummary(state.nodes, edges, state.elapsedSec),
      };
    });
  },

  onConnect: (connection) => {
    set((state) => {
      const materialCheck = canConnectByMaterial(
        state.nodes,
        connection.source ?? '',
        connection.target ?? '',
        connection.sourceHandle ?? undefined,
        connection.targetHandle ?? undefined,
      );
      if (!materialCheck.ok) {
        return {
          logs: [`Connection rejected: ${materialCheck.reason}`, ...state.logs].slice(0, 80),
        };
      }
      const edge = createEdgeFromConnection(connection);
      const edges = addEdge(edge, state.edges) as FactoryEdge[];
      return {
        ...historyPatch(state),
        edges,
        selectedEdgeId: edge.id,
        selectedNodeId: null,
        selectedPort: null,
        pendingConnectFrom: null,
        summary: withSummary(state.nodes, edges, state.elapsedSec),
        logs: [`Connected ${edge.source} -> ${edge.target}.`, ...state.logs].slice(0, 80),
      };
    });
  },

  beginClickConnect: (sourceNodeId, sourceHandle = 'out-1') => {
    set((state) => ({
      pendingConnectFrom: { nodeId: sourceNodeId, handleId: sourceHandle },
      selectedNodeId: sourceNodeId,
      selectedEdgeId: null,
      selectedPort: { nodeId: sourceNodeId, side: 'output', handleId: sourceHandle },
      logs: [`Click connection source selected: ${sourceNodeId} ${sourceHandle}.`, ...state.logs].slice(0, 80),
    }));
  },

  completeClickConnect: (targetNodeId, targetHandle = 'in-1') => {
    const source = get().pendingConnectFrom;
    if (!source || source.nodeId === targetNodeId) {
      set({ pendingConnectFrom: null });
      return;
    }

    set((state) => {
      const materialCheck = canConnectByMaterial(state.nodes, source.nodeId, targetNodeId, source.handleId, targetHandle);
      if (!materialCheck.ok) {
        return {
          pendingConnectFrom: null,
          logs: [`Connection rejected: ${materialCheck.reason}`, ...state.logs].slice(0, 80),
        };
      }
      const edge = createEdgeFromConnection({
        source: source.nodeId,
        target: targetNodeId,
        sourceHandle: source.handleId,
        targetHandle,
      });
      const edges = addEdge(edge, state.edges) as FactoryEdge[];
      return {
        ...historyPatch(state),
        edges,
        pendingConnectFrom: null,
        selectedEdgeId: edge.id,
        selectedNodeId: null,
        selectedPort: null,
        summary: withSummary(state.nodes, edges, state.elapsedSec),
        logs: [`Click-connected ${source.nodeId} ${source.handleId} -> ${targetNodeId} ${targetHandle}.`, ...state.logs].slice(0, 80),
      };
    });
  },

  selectNode: (nodeId) =>
    set((state) => ({ selectedNodeId: nodeId, selectedEdgeId: null, selectedPort: null, pendingConfigBrush: nodeId ? state.pendingConfigBrush : null })),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null, selectedPort: null, pendingConfigBrush: null }),
  selectPort: (port) => set({ selectedPort: port, selectedNodeId: port?.nodeId ?? null, selectedEdgeId: null, pendingConfigBrush: null }),

  updateNodeParams: (nodeId, patch) => {
    set((state) => {
      const update = applyNodeParamUpdate(state, nodeId, patch);

      return {
        ...historyPatch(state),
        ...update,
        summary: withSummary(update.nodes, update.edges, state.elapsedSec),
      };
    });
  },

  updatePortRule: (nodeId, side, handleId, patch) => {
    set((state) => {
      const nodes = state.nodes.map((node) =>
        node.id === nodeId
          ? mergeNodeParams(node, buildPortRulePatch(node.data.params, side, handleId, patch))
          : node,
      );
      const nextNode = nodes.find((node) => node.id === nodeId);
      const nextRule = nextNode ? getPortRule(nextNode.data.params, side, handleId) : null;
      return {
        ...historyPatch(state),
        nodes,
        summary: withSummary(nodes, state.edges, state.elapsedSec),
        logs: [
          nextRule
            ? `Updated ${nextNode?.data.params.deviceShortName} ${nextRule.label} port rule.`
            : `Updated ${nodeId} ${handleId} port rule.`,
          ...state.logs,
        ].slice(0, 80),
      };
    });
  },

  updateEdgeData: (edgeId, patch) => {
    set((state) => {
      const selectedEdge = state.edges.find((edge) => edge.id === edgeId);
      const selectedGroupId =
        selectedEdge?.data?.transportType === 'loader_arm'
          ? selectedEdge.data.armGroupId?.trim()
          : '';
      const edges = state.edges.map((edge) =>
        edge.data &&
        (edge.id === edgeId ||
          (selectedGroupId &&
            edge.data.transportType === 'loader_arm' &&
            edge.data.armGroupId?.trim() === selectedGroupId))
          ? {
              ...edge,
              data: {
                ...edge.data,
                ...patch,
                label:
                  patch.transportType === 'loader_arm'
                    ? 'Loader Arm'
                    : patch.transportType === 'conveyor'
                      ? 'Conveyor'
                      : edge.data.label,
              },
            }
          : edge,
      );
      return {
        ...(isRouteOnlyEdgePatch(patch) ? {} : historyPatch(state)),
        edges,
        summary: withSummary(state.nodes, edges, state.elapsedSec),
      };
    });
  },

  start: () => set((state) => ({ isRunning: true, logs: ['Simulation started.', ...state.logs].slice(0, 80) })),
  pause: () => set((state) => ({ isRunning: false, logs: ['Simulation paused.', ...state.logs].slice(0, 80) })),

  resetSimulation: () => {
    set((state) => {
      const nodes = state.nodes.map(resetNodeForSimulation);
      const edges = state.edges.map((edge) => ({
        ...edge,
        data: edge.data
          ? {
              ...edge.data,
              inTransit: [],
              lineBufferCount: 0,
              utilization: 0,
              armPhase: 'home' as const,
              phaseRemainingSec: 0,
              carriedQuantity: 0,
              waitPickTime: 0,
              waitSpaceTime: 0,
              warning: undefined,
            }
          : edge.data,
      }));
      return {
        ...historyPatch(state),
        nodes,
        edges,
        elapsedSec: 0,
        isRunning: false,
        summary: withSummary(nodes, edges, 0),
        logs: ['Simulation reset.', ...state.logs].slice(0, 80),
      };
    });
  },

  setSpeed: (speed) => set({ speed: clampNumber(speed, 0.1, 500) }),

  tick: (dt) => {
    const state = get();
    if (!state.isRunning) return;

    let remaining = Math.max(0, dt * state.speed);
    let elapsedSec = state.elapsedSec;
    let nodes = state.nodes;
    let edges = state.edges;
    const requestedStep = state.speed >= 200 ? 8 : state.speed >= 80 ? 5 : state.speed >= 20 ? 2 : state.settings.backgroundStepSec || 1;
    const maxStep = Math.max(0.05, Math.min(8, requestedStep));

    while (remaining > 0.0001) {
      const step = Math.min(maxStep, remaining);
      elapsedSec += step;
      const result = tickSimulation(nodes, edges, step, elapsedSec);
      nodes = result.nodes;
      edges = result.edges;
      remaining -= step;
    }

    set({
      nodes,
      edges,
      elapsedSec,
      summary: withSummary(nodes, edges, elapsedSec),
    });
  },

  captureRecord: () => {
    const { nodes, edges, summary } = get();
    const report = buildSimulationReport(nodes, edges, summary, 'Factory Takt Current Scenario Report');
    const record: SimulationRecord = {
      id: nanoid(),
      createdAt: new Date().toISOString(),
      title: `Record ${new Date().toLocaleString()}`,
      elapsedSec: summary.elapsedSec,
      finishedOutput: finishedOutput(nodes, edges),
      bottleneck: summary.bottleneck.label,
      report,
    };
    set((state) => ({
      records: [record, ...state.records].slice(0, 40),
      latestReport: report,
      logs: [`Record captured: ${record.finishedOutput} pcs, bottleneck ${record.bottleneck}.`, ...state.logs].slice(0, 80),
    }));
  },

  exportScenario: () => {
    const { nodes, edges, elapsedSec, speed, settings, panels } = get();
    downloadText(
      `Factory_Takt_Scenario_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
      JSON.stringify({ nodes, edges, elapsedSec, speed, settings, panels }, null, 2),
      'application/json;charset=utf-8',
    );
    set((state) => ({ logs: ['Scenario JSON exported.', ...state.logs].slice(0, 80) }));
  },

  exportLatestReport: () => {
    const state = get();
    const report =
      state.latestReport || buildSimulationReport(state.nodes, state.edges, state.summary, 'Factory Takt Simulation Report');
    downloadText(
      `Factory_Takt_Report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.md`,
      report,
      'text/markdown;charset=utf-8',
    );
    set({ latestReport: report });
  },

  exportRecords: () => {
    const { records } = get();
    downloadText(
      `Factory_Takt_Records_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`,
      recordsToCsv(records),
      'text/csv;charset=utf-8',
    );
  },

  runBackgroundSimulation: () => {
    const state = get();
    let nodes: FactoryNode[] = state.nodes.map(resetNodeForSimulation);
    let edges: FactoryEdge[] = state.edges.map((edge) => ({
      ...edge,
      data: edge.data
        ? {
            ...edge.data,
            inTransit: [],
            lineBufferCount: 0,
            utilization: 0,
            armPhase: 'home' as const,
            phaseRemainingSec: 0,
            carriedQuantity: 0,
            waitPickTime: 0,
            waitSpaceTime: 0,
            warning: undefined,
          }
        : edge.data,
    }));
    const targetSec = Math.max(60, state.settings.simulationTargetHours * 3600);
    const targetOutput = Math.max(1, state.settings.simulationTargetOutput);
    const step = Math.max(0.1, Math.min(5, state.settings.backgroundStepSec || 1));
    const maxSec = state.settings.simulationTargetMode === 'output' ? Math.max(targetSec, 24 * 3600) : targetSec;
    let elapsedSec = 0;
    let guard = 0;

    while (elapsedSec < maxSec && guard < 250000) {
      const nextStep = Math.min(step, maxSec - elapsedSec);
      elapsedSec += nextStep;
      const result = tickSimulation(nodes, edges, nextStep, elapsedSec);
      nodes = result.nodes;
      edges = result.edges;
      guard += 1;
      if (state.settings.simulationTargetMode === 'output' && finishedOutput(nodes, edges) >= targetOutput) break;
    }

    const summary = withSummary(nodes, edges, elapsedSec);
    const title =
      state.settings.simulationTargetMode === 'output'
        ? `Background Simulation - ${targetOutput} pcs target`
        : `Background Simulation - ${formatHours(elapsedSec)} run`;
    const report = buildSimulationReport(nodes, edges, summary, title);
    const record: SimulationRecord = {
      id: nanoid(),
      createdAt: new Date().toISOString(),
      title,
      elapsedSec,
      finishedOutput: finishedOutput(nodes, edges),
      bottleneck: summary.bottleneck.label,
      report,
    };

    downloadText(
      `Factory_Takt_Background_Report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.md`,
      report,
      'text/markdown;charset=utf-8',
    );

    set((current) => ({
      records: [record, ...current.records].slice(0, 40),
      latestReport: report,
      logs: [
        `Background simulation finished: ${formatHours(elapsedSec)}, output ${record.finishedOutput} pcs, bottleneck ${record.bottleneck}.`,
        ...current.logs,
      ].slice(0, 80),
    }));
  },

  saveScenario: (name) => {
    const state = get();
    const scenario = createSavedScenarioRecord(state, name);
    putScenarioRecord(scenario);
    set((current) => ({ logs: [`Scenario saved: ${scenario.name}.`, ...current.logs].slice(0, 80) }));
    return scenario.id;
  },

  listSavedScenarios: () => readSavedScenarioRecords().map(summarizeSavedScenario),

  loadScenario: (scenarioId) => {
    const payload = findScenarioPayload(scenarioId);
    if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) return false;

    set((state) => ({
      ...historyPatch(state),
      ...scenarioStatePatch(payload, state, `Scenario loaded: ${payload.name ?? scenarioId ?? 'latest'}.`),
    }));
    return true;
  },

  deleteSavedScenario: (scenarioId) => {
    deleteScenarioRecord(scenarioId);
    set((state) => ({ logs: [`Saved scenario deleted: ${scenarioId}.`, ...state.logs].slice(0, 80) }));
  },

  importScenarioJson: (json, name) => {
    try {
      const parsed = JSON.parse(json) as ScenarioPayload;
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return false;
      const scenario = createImportedScenarioRecord(parsed, name);
      putScenarioRecord(scenario);
      set((state) => ({
        ...historyPatch(state),
        ...scenarioStatePatch(scenario, state, `Scenario imported: ${scenario.name}.`),
      }));
      return true;
    } catch {
      set((state) => ({ logs: ['Scenario import failed: invalid JSON.', ...state.logs].slice(0, 80) }));
      return false;
    }
  },

  bootstrapScenario: (fallback) => {
    if (get().nodes.length > 0) return;
    const latest = findScenarioPayload();
    if (latest && Array.isArray(latest.nodes) && Array.isArray(latest.edges)) {
      set((state) => scenarioStatePatch(latest, state, 'Recovered last workspace from local memory.'));
      return;
    }
    if (!Array.isArray(fallback.nodes) || !Array.isArray(fallback.edges) || fallback.nodes.length === 0) {
      get().createFullLineScenario();
      return;
    }
    const payload = { ...fallback, name: fallback.name ?? 'Generic modular process line template' };
    putScenarioRecord({
      ...payload,
      id: 'scenario-built-in-modular-line',
      name: payload.name ?? 'Generic modular process line template',
      savedAt: new Date().toISOString(),
    });
    set((state) => scenarioStatePatch(payload, state, 'Loaded built-in template: generic modular line.'));
  },

  startConfigBrush: (sourceNodeId, mode) =>
    set((state) => ({
      pendingConfigBrush: { sourceNodeId, mode },
      selectedNodeId: sourceNodeId,
      selectedEdgeId: null,
      selectedPort: null,
      logs: [`Picked up ${configBrushLabel(mode, state.settings.language)} from ${sourceNodeId}. Click another machine to apply.`, ...state.logs].slice(0, 80),
    })),

  cancelConfigBrush: () => set({ pendingConfigBrush: null }),

  applyConfigBrushToTarget: (targetNodeId) => {
    let changed = 0;
    set((state) => {
      const brush = state.pendingConfigBrush;
      if (!brush) return {};
      const result = applyConfigBrushToTargetNodes(state.nodes, state.edges, brush.sourceNodeId, targetNodeId, brush.mode);
      changed = result.changed;
      const edges = result.edges;
      const logs = [
        result.reason ??
          `${configBrushLabel(brush.mode, state.settings.language)} applied from ${result.label}: ${result.changed} node(s).`,
        ...state.logs,
      ].slice(0, 80);
      return {
        ...(result.changed > 0 ? historyPatch(state) : {}),
        nodes: result.nodes,
        edges,
        pendingConfigBrush: null,
        selectedNodeId: targetNodeId,
        selectedEdgeId: state.selectedEdgeId && edges.some((edge) => edge.id === state.selectedEdgeId) ? state.selectedEdgeId : null,
        summary: withSummary(result.nodes, edges, state.elapsedSec),
        logs,
      };
    });
    return changed;
  },

  createDemoScenario: () => {
    const makeNode = (type: DeviceType, x: number, y: number, index: number, patch = {}) => {
      const data = createNodeData(type, index);
      const catalog = getCatalogItem(type);
      data.params = {
        ...data.params,
        deviceName: catalog.title,
        deviceShortName: catalog.shortName,
        ...patch,
      };
      data.params = completePortRules(data.params);
      if ('processTimeSec' in patch && !('station1ProcessTimeSec' in patch)) {
        data.params.station1ProcessTimeSec = data.params.processTimeSec;
      }
      if ('batchSize' in patch && !('station1BatchSize' in patch)) {
        data.params.station1BatchSize = data.params.batchSize;
      }
      data.metrics = createEmptyMetrics(data.params);
      return {
        id: `demo-${type}-${index}`,
        type: 'deviceNode' as const,
        position: { x, y },
        data,
      };
    };

    const nodes: FactoryNode[] = [
      makeNode('storage_feeder', 20, 160, 1, {
        initialMaterials: DEFAULT_TEMPLATE_SUPPLY,
        storageCapacity: DEFAULT_TEMPLATE_SUPPLY,
        currentStorageCount: DEFAULT_TEMPLATE_SUPPLY,
        outputBufferCapacity: 140,
        outputPortCount: 2,
        output1MaterialKind: 'part_a',
        output2MaterialKind: 'part_b',
      }),
      makeNode('process_a', 285, 80, 2),
      makeNode('process_b', 285, 255, 3, { processTimeSec: 42 }),
      makeNode('finishing', 555, 86, 4, { machineCount: 1, batchSize: 1 }),
      makeNode('finishing', 555, 260, 5, {
        finishingMode: 'serial_twice',
        firstPassProcessTimeSec: 14,
        secondPassProcessTimeSec: 16,
      }),
      makeNode('process_c', 825, 260, 6, { batchSize: 1, processTimeSec: 38 }),
      makeNode('general_inspection', 1095, 82, 7, { deviceShortName: 'QA', batchSize: 1, processTimeSec: 26 }),
      makeNode('general_inspection', 1095, 260, 8, { deviceShortName: 'QA', batchSize: 1, processTimeSec: 30 }),
    ];

    const edge = (
      source: string,
      target: string,
      label: string,
      transportType: TransportType = 'conveyor',
      patch: Partial<FlowEdgeData> = {},
    ): FactoryEdge => ({
      id: `demo-edge-${source}-${target}`,
      source,
      target,
      sourceHandle: 'out-1',
      targetHandle: 'in-1',
      type: 'flowEdge',
      animated: true,
      data: {
        ...createFlowEdgeData(label, transportType),
        ...patch,
      },
    });

    const edges: FactoryEdge[] = [
      edge('demo-storage_feeder-1', 'demo-process_a-2', 'FEED -> PROC-A', 'conveyor', { batchSize: 8, travelTimeSec: 2.5 }),
      {
        ...edge('demo-storage_feeder-1', 'demo-process_b-3', 'FEED -> PROC-B', 'conveyor', { batchSize: 6, travelTimeSec: 2.5 }),
        sourceHandle: 'out-2',
      },
      edge('demo-process_a-2', 'demo-finishing-4', 'PROC-A Arm -> FIN-A', 'loader_arm', { pickCount: 5, triggerBatch: 5 }),
      edge('demo-process_b-3', 'demo-finishing-5', 'PROC-B Arm -> FIN-B', 'loader_arm', { pickCount: 5, triggerBatch: 5 }),
      edge('demo-finishing-4', 'demo-general_inspection-7', 'FIN-A -> QA', 'conveyor', { batchSize: 8, travelTimeSec: 3 }),
      edge('demo-finishing-5', 'demo-process_c-6', 'FIN-B -> PROC-C', 'conveyor', { batchSize: 6, travelTimeSec: 3 }),
      edge('demo-process_c-6', 'demo-general_inspection-8', 'PROC-C Arm -> QA', 'loader_arm', { pickCount: 5, triggerBatch: 5 }),
    ];

    set((state) => ({
      ...historyPatch(state),
      nodes,
      edges,
      elapsedSec: 0,
      isRunning: true,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPort: null,
      pendingConnectFrom: null,
      summary: withSummary(nodes, edges, 0),
      logs: ['Demo scenario generated and started.', ...state.logs].slice(0, 80),
    }));
  },

  createFullLineScenario: () => {
    const makeNode = (
      id: string,
      type: DeviceType,
      x: number,
      y: number,
      index: number,
      patch: Partial<DeviceParameters> = {},
    ): FactoryNode => {
      const data = createNodeData(type, index);
      const catalog = getCatalogItem(type);
      data.params = {
        ...data.params,
        deviceName: catalog.title,
        deviceShortName: patch.deviceShortName ?? catalog.shortName,
        deviceCode: patch.deviceCode ?? `${(patch.deviceShortName ?? catalog.shortName).replace(/\s+/g, '-').toUpperCase()}-${String(index).padStart(2, '0')}`,
        ...patch,
      };
      data.params = completePortRules(data.params);
      if ('processTimeSec' in patch && !('station1ProcessTimeSec' in patch)) {
        data.params.station1ProcessTimeSec = data.params.processTimeSec;
      }
      if ('batchSize' in patch && !('station1BatchSize' in patch)) {
        data.params.station1BatchSize = data.params.batchSize;
      }
      data.label = data.params.deviceShortName;
      data.metrics = createEmptyMetrics(data.params);
      data.runtime = createRuntime(data.params.enabled ? 'idle' : 'stopped');
      return {
        id,
        type: 'deviceNode',
        position: { x, y },
        data,
      };
    };

    const nodes: FactoryNode[] = [
      makeNode('line-feed', 'storage_feeder', 0, 335, 1, {
        deviceName: 'Part A / Part B Storage Feeder',
        deviceShortName: 'FEED',
        deviceCode: 'FEED-01',
        feedBatchSize: 1,
        feedIntervalSec: 3,
        initialMaterials: DEFAULT_TEMPLATE_SUPPLY,
        storageCapacity: DEFAULT_TEMPLATE_SUPPLY,
        currentStorageCount: DEFAULT_TEMPLATE_SUPPLY,
        outputBufferCapacity: 180,
        outputPortCount: 2,
        materialKind: 'mixed',
        output1MaterialKind: 'part_a',
        output2MaterialKind: 'part_b',
        partAStorageCapacity: 180,
        partAStorageCount: 0,
        partBStorageCapacity: 180,
        partBStorageCount: 0,
      }),
      makeNode('line-feed-a-inspection', 'general_inspection', 170, 100, 3, {
        deviceName: 'Part A Feeder Inspection',
        deviceShortName: 'QA',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('line-feed-b-inspection', 'general_inspection', 170, 570, 4, {
        deviceName: 'Part B Feeder Inspection',
        deviceShortName: 'QA',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('line-a-1', 'process_a', 340, 40, 5, {
        deviceName: 'Process A 1',
        deviceCode: 'PROC-A-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('line-a-2', 'process_a', 340, 175, 6, {
        deviceName: 'Process A 2',
        deviceCode: 'PROC-A-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('line-b-1', 'process_b', 340, 505, 7, {
        deviceName: 'Process B 1',
        deviceCode: 'PROC-B-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('line-b-2', 'process_b', 340, 640, 8, {
        deviceName: 'Process B 2',
        deviceCode: 'PROC-B-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('line-a-inspection-1', 'general_inspection', 510, 40, 9, {
        deviceName: 'QA A 1',
        deviceShortName: 'QA',
        deviceCode: 'QA-A-01',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('line-a-inspection-2', 'general_inspection', 510, 175, 10, {
        deviceName: 'QA A 2',
        deviceShortName: 'QA',
        deviceCode: 'QA-A-02',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('line-b-inspection-1', 'general_inspection', 510, 505, 11, {
        deviceName: 'QA B 1',
        deviceShortName: 'QA',
        deviceCode: 'QA-B-01',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('line-b-inspection-2', 'general_inspection', 510, 640, 12, {
        deviceName: 'QA B 2',
        deviceShortName: 'QA',
        deviceCode: 'QA-B-02',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('line-c-1', 'process_c', 680, 505, 13, {
        deviceName: 'Process C 1',
        deviceCode: 'PROC-C-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('line-c-2', 'process_c', 680, 640, 14, {
        deviceName: 'Process C 2',
        deviceCode: 'PROC-C-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('line-c-inspection-1', 'general_inspection', 850, 505, 15, {
        deviceName: 'QA C 1',
        deviceShortName: 'QA',
        deviceCode: 'QA-C-01',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('line-c-inspection-2', 'general_inspection', 850, 640, 16, {
        deviceName: 'QA C 2',
        deviceShortName: 'QA',
        deviceCode: 'QA-C-02',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('line-fin-a-1', 'finishing', 680, 40, 17, {
        deviceName: 'Finishing A 1',
        deviceCode: 'FIN-A-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 35,
        outputBufferCapacity: 30,
      }),
      makeNode('line-fin-a-2', 'finishing', 680, 175, 18, {
        deviceName: 'Finishing A 2',
        deviceCode: 'FIN-A-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 35,
        outputBufferCapacity: 30,
      }),
      makeNode('line-fin-b-1', 'finishing_b', 1020, 505, 19, {
        deviceName: 'Finishing B 1',
        deviceShortName: 'FIN-B',
        deviceCode: 'FIN-B-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 35,
        outputBufferCapacity: 30,
      }),
      makeNode('line-fin-b-2', 'finishing_b', 1020, 640, 20, {
        deviceName: 'Finishing B 2',
        deviceShortName: 'FIN-B',
        deviceCode: 'FIN-B-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 35,
        outputBufferCapacity: 30,
      }),
      makeNode('line-dry-a', 'spin_dryer', 850, 110, 21, {
        deviceName: 'Part A Batch Dryer',
        deviceShortName: 'DRY-A',
        deviceCode: 'DRY-A-01',
        inputBufferCapacity: 80,
        outputBufferCapacity: 120,
        dryerColumnBatchSize: 5,
        dryerColumnCount: 5,
        dryerDryTimeSec: 35,
      }),
      makeNode('line-dry-b', 'spin_dryer', 1190, 500, 22, {
        deviceName: 'Part B Batch Dryer',
        deviceShortName: 'DRY-B',
        deviceCode: 'DRY-B-01',
        inputBufferCapacity: 80,
        outputBufferCapacity: 120,
        dryerColumnBatchSize: 5,
        dryerColumnCount: 5,
        dryerDryTimeSec: 35,
      }),
      makeNode('line-join-store', 'merge_buffer', 1360, 335, 23),
      makeNode('line-join-wash-a', 'wash_dry', 1530, 170, 24, {
        deviceShortName: 'WASH-A',
        materialKind: 'part_a',
        cleanerLaneCount: 1,
        cleanerLaneCapacity: 20,
        cleanerPushIntervalSec: 2.5,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 3,
      }),
      makeNode('line-join-wash-b', 'wash_dry', 1530, 430, 25, {
        deviceShortName: 'WASH-B',
        materialKind: 'part_b',
        cleanerLaneCount: 1,
        cleanerLaneCapacity: 25,
        cleanerPushIntervalSec: 2.5,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 3,
      }),
      makeNode('line-join-qa-a1', 'inspection_a', 1700, 170, 26, { deviceShortName: 'QA-A1', materialKind: 'part_a' }),
      makeNode('line-join-qa-b1', 'inspection_a', 1700, 430, 27, { deviceShortName: 'QA-B1', materialKind: 'part_b' }),
      makeNode('line-join-qa-a2', 'inspection_b', 1870, 170, 28, { deviceShortName: 'QA-A2', materialKind: 'part_a' }),
      makeNode('line-join-qa-b2', 'inspection_b', 1870, 430, 29, { deviceShortName: 'QA-B2', materialKind: 'part_b' }),
      makeNode('line-join-merge', 'join_station', 2040, 300, 30),
      makeNode('line-join-fasten', 'fasten_station', 2210, 300, 31),
      makeNode('line-join-wash-1', 'wash_dry', 2380, 300, 32, {
        deviceShortName: 'WASH-2CH',
        cleanerLaneCount: 2,
        cleanerLaneCapacity: 24,
        cleanerPushIntervalSec: 8.4,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 8.4,
      }),
      makeNode('line-join-func', 'functional_check', 2550, 300, 33),
      makeNode('line-join-perf-open', 'performance_check', 2720, 300, 34, { deviceShortName: 'PERF-1' }),
      makeNode('line-join-wash-2', 'wash_dry', 2720, 525, 35, {
        deviceShortName: 'WASH-2',
        cleanerLaneCount: 2,
        cleanerLaneCapacity: 24,
        cleanerPushIntervalSec: 8.4,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 8.4,
      }),
      makeNode('line-join-dryer', 'spin_dryer', 2550, 525, 36, {
        deviceShortName: 'DRY-M',
        dryerColumnBatchSize: 4,
        dryerColumnCount: 4,
        dryerDryTimeSec: 17,
        inputBufferCapacity: 80,
        outputBufferCapacity: 80,
      }),
      makeNode('line-join-perf-final', 'performance_check', 2380, 525, 37, { deviceShortName: 'PERF-2' }),
      makeNode('line-join-fill', 'fill_station', 2210, 525, 38),
      makeNode('line-join-press', 'press_station', 2040, 525, 39),
      makeNode('line-join-perf-closed', 'performance_check', 1870, 525, 40, { deviceShortName: 'PERF-3' }),
      makeNode('line-join-visual', 'visual_inspection', 1700, 650, 41),
      makeNode('line-join-manual', 'manual_buffer', 1530, 650, 42),
      makeNode('line-join-surface', 'surface_treatment', 1360, 650, 43),
      makeNode('line-join-pack', 'packing_sink', 1190, 650, 44),
    ];

    const edge = (
      source: string,
      target: string,
      label: string,
      transportType: TransportType,
      patch: Partial<FlowEdgeData> & { sourceHandle?: string; targetHandle?: string } = {},
    ): FactoryEdge => {
      const { sourceHandle = 'out-1', targetHandle = 'in-1', ...dataPatch } = patch;
      return {
        id: `line-edge-${source}-${target}`,
        source,
        target,
        sourceHandle,
        targetHandle,
        type: 'flowEdge',
        animated: true,
        data: {
          ...createFlowEdgeData(label, transportType),
          ...dataPatch,
        },
      };
    };

    const armDefaults: Partial<FlowEdgeData> = {
      pickCount: 5,
      triggerBatch: 5,
      pickTimeSec: 2,
      moveTimeSec: 5,
      placeTimeSec: 2,
      returnTimeSec: 4,
    };

    const conveyorDefaults: Partial<FlowEdgeData> = {
      batchSize: 1,
      travelTimeSec: 1,
      lineBufferCapacity: 20,
      capacity: 8,
    };

    const assemblyConveyor: Partial<FlowEdgeData> = {
      batchSize: 1,
      travelTimeSec: 1,
      lineBufferCapacity: 20,
      capacity: 8,
    };

    const mainLineConveyor: Partial<FlowEdgeData> = {
      batchSize: 1,
      dispatchIntervalSec: 3,
      travelTimeSec: 40,
      lineBufferCapacity: 100,
      capacity: 100,
      edgeShape: 'orthogonal',
    };

    const edges: FactoryEdge[] = [
      edge('line-feed', 'line-feed-a-inspection', 'FEED-QA A', 'conveyor', { ...conveyorDefaults, sourceHandle: 'out-1' }),
      edge('line-feed', 'line-feed-b-inspection', 'FEED-QA B', 'conveyor', { ...conveyorDefaults, sourceHandle: 'out-2' }),
      edge('line-feed-a-inspection', 'line-a-1', 'ARM-FEED-A', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-FEED-A' }),
      edge('line-feed-a-inspection', 'line-a-2', 'ARM-FEED-A', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-FEED-A' }),
      edge('line-feed-b-inspection', 'line-b-1', 'ARM-FEED-B', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-FEED-B' }),
      edge('line-feed-b-inspection', 'line-b-2', 'ARM-FEED-B', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-FEED-B' }),
      edge('line-a-1', 'line-a-inspection-1', 'PROC-A-01 QA', 'conveyor', conveyorDefaults),
      edge('line-a-2', 'line-a-inspection-2', 'PROC-A-02 QA', 'conveyor', conveyorDefaults),
      edge('line-a-inspection-1', 'line-fin-a-1', 'ARM-A-FIN', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-A-FIN' }),
      edge('line-a-inspection-1', 'line-fin-a-2', 'ARM-A-FIN', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-A-FIN' }),
      edge('line-a-inspection-2', 'line-fin-a-1', 'ARM-A-FIN', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-A-FIN' }),
      edge('line-a-inspection-2', 'line-fin-a-2', 'ARM-A-FIN', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-A-FIN' }),
      edge('line-b-1', 'line-b-inspection-1', 'PROC-B-01 QA', 'conveyor', conveyorDefaults),
      edge('line-b-2', 'line-b-inspection-2', 'PROC-B-02 QA', 'conveyor', conveyorDefaults),
      edge('line-b-inspection-1', 'line-c-1', 'ARM-B-C', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-B-C' }),
      edge('line-b-inspection-1', 'line-c-2', 'ARM-B-C', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-B-C' }),
      edge('line-b-inspection-2', 'line-c-1', 'ARM-B-C', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-B-C' }),
      edge('line-b-inspection-2', 'line-c-2', 'ARM-B-C', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-B-C' }),
      edge('line-c-1', 'line-c-inspection-1', 'PROC-C-01 QA', 'conveyor', conveyorDefaults),
      edge('line-c-2', 'line-c-inspection-2', 'PROC-C-02 QA', 'conveyor', conveyorDefaults),
      edge('line-c-inspection-1', 'line-fin-b-1', 'ARM-C-FIN', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-C-FIN' }),
      edge('line-c-inspection-1', 'line-fin-b-2', 'ARM-C-FIN', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-C-FIN' }),
      edge('line-c-inspection-2', 'line-fin-b-1', 'ARM-C-FIN', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-C-FIN' }),
      edge('line-c-inspection-2', 'line-fin-b-2', 'ARM-C-FIN', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-C-FIN' }),
      edge('line-fin-a-1', 'line-dry-a', 'FIN-A -> DRY', 'conveyor', { ...conveyorDefaults, travelTimeSec: 3 }),
      edge('line-fin-a-2', 'line-dry-a', 'FIN-A -> DRY', 'conveyor', { ...conveyorDefaults, travelTimeSec: 3 }),
      edge('line-fin-b-1', 'line-dry-b', 'FIN-B -> DRY', 'conveyor', { ...conveyorDefaults, travelTimeSec: 3 }),
      edge('line-fin-b-2', 'line-dry-b', 'FIN-B -> DRY', 'conveyor', { ...conveyorDefaults, travelTimeSec: 3 }),
      edge('line-dry-a', 'line-join-store', 'Part A main line -> MERGE', 'conveyor', {
        ...mainLineConveyor,
        targetHandle: 'in-1',
      }),
      edge('line-dry-b', 'line-join-store', 'Part B main line -> MERGE', 'conveyor', {
        ...mainLineConveyor,
        targetHandle: 'in-2',
      }),
      edge('line-join-store', 'line-join-wash-a', 'MERGE-A -> WASH', 'conveyor', {
        ...assemblyConveyor,
        sourceHandle: 'out-1',
      }),
      edge('line-join-store', 'line-join-wash-b', 'MERGE-B -> WASH', 'conveyor', {
        ...assemblyConveyor,
        sourceHandle: 'out-2',
      }),
      edge('line-join-wash-a', 'line-join-qa-a1', 'WASH-A -> QA-A1', 'conveyor', assemblyConveyor),
      edge('line-join-wash-b', 'line-join-qa-b1', 'WASH-B -> QA-B1', 'conveyor', assemblyConveyor),
      edge('line-join-qa-a1', 'line-join-qa-a2', 'QA-A1 -> QA-A2', 'conveyor', assemblyConveyor),
      edge('line-join-qa-b1', 'line-join-qa-b2', 'QA-B1 -> QA-B2', 'conveyor', assemblyConveyor),
      edge('line-join-qa-a2', 'line-join-merge', 'QA-A2 -> JOIN', 'conveyor', {
        ...assemblyConveyor,
        targetHandle: 'in-1',
      }),
      edge('line-join-qa-b2', 'line-join-merge', 'QA-B2 -> JOIN', 'conveyor', {
        ...assemblyConveyor,
        targetHandle: 'in-2',
      }),
      edge('line-join-merge', 'line-join-fasten', 'JOIN -> FASTEN', 'conveyor', assemblyConveyor),
      edge('line-join-fasten', 'line-join-wash-1', 'FASTEN -> WASH-1', 'conveyor', assemblyConveyor),
      edge('line-join-wash-1', 'line-join-func', 'WASH-1 -> FUNC', 'conveyor', assemblyConveyor),
      edge('line-join-func', 'line-join-perf-open', 'FUNC -> PERF-1', 'conveyor', assemblyConveyor),
      edge('line-join-perf-open', 'line-join-wash-2', 'PERF-1 -> WASH-2', 'conveyor', assemblyConveyor),
      edge('line-join-wash-2', 'line-join-dryer', 'WASH-2 -> DRY-M', 'conveyor', assemblyConveyor),
      edge('line-join-dryer', 'line-join-perf-final', 'DRY-M -> PERF-2', 'conveyor', assemblyConveyor),
      edge('line-join-perf-final', 'line-join-fill', 'PERF-2 -> FILL', 'conveyor', assemblyConveyor),
      edge('line-join-fill', 'line-join-press', 'FILL -> PRESS', 'conveyor', assemblyConveyor),
      edge('line-join-press', 'line-join-perf-closed', 'PRESS -> PERF-3', 'conveyor', assemblyConveyor),
      edge('line-join-perf-closed', 'line-join-visual', 'PERF-3 -> VISUAL', 'conveyor', assemblyConveyor),
      edge('line-join-visual', 'line-join-manual', 'VISUAL -> MANUAL', 'conveyor', assemblyConveyor),
      edge('line-join-manual', 'line-join-surface', 'MANUAL -> SURFACE', 'conveyor', assemblyConveyor),
      edge('line-join-surface', 'line-join-pack', 'SURFACE -> PACK', 'conveyor', assemblyConveyor),
    ];

    const scenario: SavedScenarioRecord = {
      id: `scenario-${nanoid()}`,
      name: 'Modular Process A/B/C/Finishing Demo',
      nodes,
      edges,
      elapsedSec: 0,
      speed: 2,
      settings: get().settings,
      panels: get().panels,
      savedAt: new Date().toISOString(),
    };

    putScenarioRecord(scenario);

    set((state) => ({
      ...historyPatch(state),
      nodes,
      edges,
      elapsedSec: 0,
      speed: 2,
      settings: state.settings,
      isRunning: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPort: null,
      pendingConnectFrom: null,
      summary: withSummary(nodes, edges, 0),
      logs: ['Modular flow scenario generated and saved to localStorage.', ...state.logs].slice(0, 80),
    }));
  },

  createAssemblyScenario: () => {
    const makeNode = (
      id: string,
      type: DeviceType,
      x: number,
      y: number,
      index: number,
      patch: Partial<DeviceParameters> = {},
    ): FactoryNode => {
      const data = createNodeData(type, index);
      const catalog = getCatalogItem(type);
      data.params = {
        ...data.params,
        deviceName: patch.deviceName ?? catalog.title,
        deviceShortName: patch.deviceShortName ?? catalog.shortName,
        deviceCode:
          patch.deviceCode ??
          `${(patch.deviceShortName ?? catalog.shortName).replace(/\s+/g, '-').toUpperCase()}-${String(index).padStart(2, '0')}`,
        ...patch,
      };
      data.params = completePortRules(data.params);
      if ('processTimeSec' in patch && !('station1ProcessTimeSec' in patch)) {
        data.params.station1ProcessTimeSec = data.params.processTimeSec;
      }
      if ('batchSize' in patch && !('station1BatchSize' in patch)) {
        data.params.station1BatchSize = data.params.batchSize;
      }
      data.label = data.params.deviceShortName;
      data.metrics = createEmptyMetrics(data.params);
      data.runtime = createRuntime(data.params.enabled ? 'idle' : 'stopped');
      return { id, type: 'deviceNode', position: { x, y }, data };
    };

    const nodes: FactoryNode[] = [
      makeNode('post-a-line', 'material_source', 0, 80, 1, {
        deviceName: 'Part A upstream line',
        deviceShortName: 'PART-A',
        materialKind: 'part_a',
        output1MaterialKind: 'part_a',
        feedBatchSize: 1,
        feedIntervalSec: 3,
        outputBufferCapacity: 100,
      }),
      makeNode('post-b-line', 'material_source', 0, 260, 2, {
        deviceName: 'Part B upstream line',
        deviceShortName: 'PART-B',
        materialKind: 'part_b',
        output1MaterialKind: 'part_b',
        feedBatchSize: 1,
        feedIntervalSec: 3,
        outputBufferCapacity: 100,
      }),
      makeNode('post-merge', 'merge_buffer', 250, 170, 3),
      makeNode('post-wash-a', 'wash_dry', 520, 70, 4, {
        deviceShortName: 'WASH-A',
        materialKind: 'part_a',
        cleanerLaneCount: 1,
        cleanerLaneCapacity: 20,
        cleanerPushIntervalSec: 2.5,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 3,
      }),
      makeNode('post-wash-b', 'wash_dry', 520, 270, 5, {
        deviceShortName: 'WASH-B',
        materialKind: 'part_b',
        cleanerLaneCount: 1,
        cleanerLaneCapacity: 25,
        cleanerPushIntervalSec: 2.5,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 3,
      }),
      makeNode('post-qa-a1', 'inspection_a', 790, 70, 6, { deviceShortName: 'QA-A1', materialKind: 'part_a' }),
      makeNode('post-qa-b1', 'inspection_a', 790, 270, 7, { deviceShortName: 'QA-B1', materialKind: 'part_b' }),
      makeNode('post-qa-a2', 'inspection_b', 1060, 70, 8, { deviceShortName: 'QA-A2', materialKind: 'part_a' }),
      makeNode('post-qa-b2', 'inspection_b', 1060, 270, 9, { deviceShortName: 'QA-B2', materialKind: 'part_b' }),
      makeNode('post-join', 'join_station', 1330, 170, 10),
      makeNode('post-fasten', 'fasten_station', 1600, 170, 11),
      makeNode('post-wash-1', 'wash_dry', 1870, 170, 12, {
        deviceShortName: 'WASH-2CH',
        cleanerLaneCount: 2,
        cleanerLaneCapacity: 24,
        cleanerPushIntervalSec: 8.4,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 8.4,
      }),
      makeNode('post-func', 'functional_check', 2140, 170, 13),
      makeNode('post-perf-open', 'performance_check', 2410, 170, 14, { deviceShortName: 'PERF-1' }),
      makeNode('post-wash-2', 'wash_dry', 2680, 170, 15, {
        deviceShortName: 'WASH-2',
        cleanerLaneCount: 2,
        cleanerLaneCapacity: 24,
        cleanerPushIntervalSec: 8.4,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 8.4,
      }),
      makeNode('post-dryer', 'spin_dryer', 2950, 170, 16, {
        deviceShortName: 'DRY-M',
        dryerColumnBatchSize: 4,
        dryerColumnCount: 4,
        dryerDryTimeSec: 17,
        inputBufferCapacity: 80,
        outputBufferCapacity: 80,
      }),
      makeNode('post-perf-final', 'performance_check', 3220, 170, 17, { deviceShortName: 'PERF-2' }),
      makeNode('post-fill', 'fill_station', 3490, 170, 18),
      makeNode('post-press', 'press_station', 3760, 170, 19),
      makeNode('post-perf-closed', 'performance_check', 4030, 170, 20, { deviceShortName: 'PERF-3' }),
      makeNode('post-visual', 'visual_inspection', 4300, 170, 21),
      makeNode('post-manual', 'manual_buffer', 4570, 170, 22),
      makeNode('post-surface', 'surface_treatment', 4840, 170, 23),
      makeNode('post-pack', 'packing_sink', 5110, 170, 24),
    ];

    const edge = (
      id: string,
      source: string,
      target: string,
      patch: { sourceHandle?: string | null; targetHandle?: string | null; data?: Partial<FlowEdgeData> } = {},
    ): FactoryEdge => ({
      id,
      source,
      target,
      sourceHandle: patch.sourceHandle ?? 'out-1',
      targetHandle: patch.targetHandle ?? 'in-1',
      type: 'flowEdge',
      animated: true,
      data: {
        ...createFlowEdgeData(String(patch.data?.label ?? 'CV'), 'conveyor'),
        batchSize: 1,
        travelTimeSec: 3,
        capacity: 100,
        lineBufferCapacity: 100,
        ...(patch.data ?? {}),
      },
    });

    const fast = { batchSize: 1, travelTimeSec: 0.4, capacity: 8, lineBufferCapacity: 20 };
    const normal = { batchSize: 1, travelTimeSec: 1, capacity: 8, lineBufferCapacity: 20 };
    const edges: FactoryEdge[] = [
      edge('post-edge-big-to-store', 'post-a-line', 'post-merge', { targetHandle: 'in-1', data: { label: 'Part A main line', travelTimeSec: 3, lineBufferCapacity: 100 } }),
      edge('post-edge-small-to-store', 'post-b-line', 'post-merge', { targetHandle: 'in-2', data: { label: 'Part B main line', travelTimeSec: 3, lineBufferCapacity: 100 } }),
      edge('post-edge-store-big-wash', 'post-merge', 'post-wash-a', { sourceHandle: 'out-1', data: { label: 'MERGE-A -> WASH', ...fast } }),
      edge('post-edge-store-small-wash', 'post-merge', 'post-wash-b', { sourceHandle: 'out-2', data: { label: 'MERGE-B -> WASH', ...fast } }),
      edge('post-edge-wash-big-eddy', 'post-wash-a', 'post-qa-a1', { data: { label: 'WASH-A -> QA-A1', ...normal } }),
      edge('post-edge-wash-small-eddy', 'post-wash-b', 'post-qa-b1', { data: { label: 'WASH-B -> QA-B1', ...normal } }),
      edge('post-edge-eddy-big-size', 'post-qa-a1', 'post-qa-a2', { data: { label: 'QA-A1 -> QA-A2', ...normal } }),
      edge('post-edge-eddy-small-size', 'post-qa-b1', 'post-qa-b2', { data: { label: 'QA-B1 -> QA-B2', ...normal } }),
      edge('post-edge-size-big-pair', 'post-qa-a2', 'post-join', { targetHandle: 'in-1', data: { label: 'QA-A2 -> JOIN', ...normal } }),
      edge('post-edge-size-small-pair', 'post-qa-b2', 'post-join', { targetHandle: 'in-2', data: { label: 'QA-B2 -> JOIN', ...normal } }),
      edge('post-edge-pair-rivet', 'post-join', 'post-fasten', { data: { label: 'JOIN -> FASTEN', ...normal } }),
      edge('post-edge-rivet-wash1', 'post-fasten', 'post-wash-1', { data: { label: 'FASTEN -> WASH', ...normal } }),
      edge('post-edge-wash1-flex', 'post-wash-1', 'post-func', { data: { label: 'WASH -> FUNC', ...normal } }),
      edge('post-edge-flex-vib-open', 'post-func', 'post-perf-open', { data: { label: 'FUNC -> PERF-1', ...normal } }),
      edge('post-edge-vib-open-wash2', 'post-perf-open', 'post-wash-2', { data: { label: 'PERF-1 -> WASH', ...normal } }),
      edge('post-edge-wash2-dryer', 'post-wash-2', 'post-dryer', { data: { label: 'Wash -> Dryer', ...normal } }),
      edge('post-edge-dryer-vib-final', 'post-dryer', 'post-perf-final', { data: { label: 'DRY -> PERF-2', ...normal } }),
      edge('post-edge-vib-final-grease', 'post-perf-final', 'post-fill', { data: { label: 'PERF-2 -> FILL', ...normal } }),
      edge('post-edge-grease-cap', 'post-fill', 'post-press', { data: { label: 'FILL -> PRESS', ...normal } }),
      edge('post-edge-cap-vib-closed', 'post-press', 'post-perf-closed', { data: { label: 'PRESS -> PERF-3', ...normal } }),
      edge('post-edge-vib-closed-visual', 'post-perf-closed', 'post-visual', { data: { label: 'PERF-3 -> VISUAL', ...normal } }),
      edge('post-edge-visual-manual', 'post-visual', 'post-manual', { data: { label: 'Visual -> Manual table', ...normal } }),
      edge('post-edge-manual-rust', 'post-manual', 'post-surface', { data: { label: 'MANUAL -> SURFACE', ...normal } }),
      edge('post-edge-rust-pack', 'post-surface', 'post-pack', { data: { label: 'SURFACE -> PACK', ...normal } }),
    ];

    const scenario: SavedScenarioRecord = {
      id: `scenario-${nanoid()}`,
      name: 'Generic post-process line demo',
      nodes,
      edges,
      elapsedSec: 0,
      speed: 8,
      settings: get().settings,
      panels: get().panels,
      savedAt: new Date().toISOString(),
    };

    putScenarioRecord(scenario);

    set((state) => ({
      ...historyPatch(state),
      nodes,
      edges,
      elapsedSec: 0,
      speed: 8,
      settings: state.settings,
      isRunning: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedPort: null,
      pendingConnectFrom: null,
      summary: withSummary(nodes, edges, 0),
      logs: ['Assembly scenario generated and saved to localStorage.', ...state.logs].slice(0, 80),
    }));
  },

  updateSettings: (patch) => {
    set((state) => {
      const settings = { ...state.settings, ...patch };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return { settings };
    });
  },

  togglePanel: (panel) => {
    set((state) => ({ panels: { ...state.panels, [panel]: !state.panels[panel] } }));
  },

  setPanelSize: (panel, value) => {
    const bounds = {
      leftWidth: [180, 420],
      rightWidth: [260, 560],
      bottomHeight: [140, 460],
    } as const;
    set((state) => ({
      panels: {
        ...state.panels,
        [panel]: clampNumber(value, bounds[panel][0], bounds[panel][1]),
      },
    }));
  },

  undo: () => {
    set((state) => {
      const previous = state.historyPast.at(-1);
      if (!previous) return state;
      const current = createHistorySnapshot(state);
      return restoreHistorySnapshot(previous, state.historyPast.slice(0, -1), [current, ...state.historyFuture].slice(0, 60), state.logs, 'Undo applied.');
    });
  },

  redo: () => {
    set((state) => {
      const next = state.historyFuture[0];
      if (!next) return state;
      const current = createHistorySnapshot(state);
      return restoreHistorySnapshot(next, appendHistory(state.historyPast, current), state.historyFuture.slice(1), state.logs, 'Redo applied.');
    });
  },

  addLog: (message) => set((state) => ({ logs: [message, ...state.logs].slice(0, 80) })),
}));
