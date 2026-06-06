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
import { createEmptyMetrics, createNodeData, createRuntime, getCatalogItem } from '../data/deviceCatalog';
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
  createBearingRacewayScenario: () => void;
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
    if (!latest || !Array.isArray(latest.nodes) || !Array.isArray(latest.edges)) {
      get().createBearingRacewayScenario();
      return;
    }
    const payload = latest && Array.isArray(latest.nodes) && Array.isArray(latest.edges) ? latest : { ...fallback, name: '深沟球后磨部分' };
    if (!latest) {
      putScenarioRecord({
        ...payload,
        id: 'scenario-built-in-deep-groove-post-grind',
        name: '深沟球后磨部分',
        savedAt: new Date().toISOString(),
      });
    }
    set((state) => scenarioStatePatch(payload, state, latest ? 'Recovered last workspace from local memory.' : 'Loaded built-in template: 深沟球后磨部分.'));
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
        initialMaterials: 1600,
        currentStorageCount: 1600,
        outputBufferCapacity: 140,
        outputPortCount: 2,
        output1MaterialKind: 'big_ring',
        output2MaterialKind: 'small_ring',
      }),
      makeNode('or_grinder', 285, 80, 2),
      makeNode('ir_grinder', 285, 255, 3, { processTimeSec: 42 }),
      makeNode('superfinishing', 555, 86, 4, { machineCount: 1, batchSize: 1 }),
      makeNode('superfinishing', 555, 260, 5, {
        superfinishingMode: 'serial_twice',
        firstPassProcessTimeSec: 14,
        secondPassProcessTimeSec: 16,
      }),
      makeNode('bore_grinder', 825, 260, 6, { batchSize: 1, processTimeSec: 38 }),
      makeNode('general_gauge', 1095, 82, 7, { deviceShortName: '检测', batchSize: 1, processTimeSec: 26 }),
      makeNode('general_gauge', 1095, 260, 8, { deviceShortName: '检测', batchSize: 1, processTimeSec: 30 }),
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
      edge('demo-storage_feeder-1', 'demo-or_grinder-2', 'FEED -> OR', 'conveyor', { batchSize: 8, travelTimeSec: 2.5 }),
      {
        ...edge('demo-storage_feeder-1', 'demo-ir_grinder-3', 'FEED -> IR', 'conveyor', { batchSize: 6, travelTimeSec: 2.5 }),
        sourceHandle: 'out-2',
      },
      edge('demo-or_grinder-2', 'demo-superfinishing-4', 'OR Arm -> SF', 'loader_arm', { pickCount: 5, triggerBatch: 5 }),
      edge('demo-ir_grinder-3', 'demo-superfinishing-5', 'IR Arm -> SF', 'loader_arm', { pickCount: 5, triggerBatch: 5 }),
      edge('demo-superfinishing-4', 'demo-general_gauge-7', 'SF -> Gauge', 'conveyor', { batchSize: 8, travelTimeSec: 3 }),
      edge('demo-superfinishing-5', 'demo-bore_grinder-6', 'SF -> BORE', 'conveyor', { batchSize: 6, travelTimeSec: 3 }),
      edge('demo-bore_grinder-6', 'demo-general_gauge-8', 'BORE Arm -> Gauge', 'loader_arm', { pickCount: 5, triggerBatch: 5 }),
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

  createBearingRacewayScenario: () => {
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
      makeNode('bearing-feed', 'storage_feeder', 0, 335, 1, {
        deviceName: 'Big / Small Ring Storage Feeder',
        deviceShortName: 'FEED',
        deviceCode: 'FEED-01',
        feedBatchSize: 1,
        feedIntervalSec: 3,
        storageCapacity: 2000,
        currentStorageCount: 2000,
        outputBufferCapacity: 180,
        outputPortCount: 2,
        materialKind: 'mixed',
        output1MaterialKind: 'big_ring',
        output2MaterialKind: 'small_ring',
        assemblyBigStorageCapacity: 180,
        assemblyBigStorageCount: 0,
        assemblySmallStorageCapacity: 180,
        assemblySmallStorageCount: 0,
      }),
      makeNode('bearing-feed-or-gauge', 'general_gauge', 170, 100, 3, {
        deviceName: 'Big Ring Feeder Gauge',
        deviceShortName: '检测',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('bearing-feed-ir-gauge', 'general_gauge', 170, 570, 4, {
        deviceName: 'Small Ring Feeder Gauge',
        deviceShortName: '检测',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('bearing-or-1', 'or_grinder', 340, 40, 5, {
        deviceName: 'OR Grinder 1',
        deviceCode: 'OR-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('bearing-or-2', 'or_grinder', 340, 175, 6, {
        deviceName: 'OR Grinder 2',
        deviceCode: 'OR-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('bearing-ir-1', 'ir_grinder', 340, 505, 7, {
        deviceName: 'IR Grinder 1',
        deviceCode: 'IR-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('bearing-ir-2', 'ir_grinder', 340, 640, 8, {
        deviceName: 'IR Grinder 2',
        deviceCode: 'IR-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('bearing-or-gauge-1', 'general_gauge', 510, 40, 9, {
        deviceName: 'OR Gauge 1',
        deviceShortName: '检测',
        deviceCode: 'OR-GAUGE-01',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('bearing-or-gauge-2', 'general_gauge', 510, 175, 10, {
        deviceName: 'OR Gauge 2',
        deviceShortName: '检测',
        deviceCode: 'OR-GAUGE-02',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('bearing-ir-gauge-1', 'general_gauge', 510, 505, 11, {
        deviceName: 'IR Gauge 1',
        deviceShortName: '检测',
        deviceCode: 'IR-GAUGE-01',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('bearing-ir-gauge-2', 'general_gauge', 510, 640, 12, {
        deviceName: 'IR Gauge 2',
        deviceShortName: '检测',
        deviceCode: 'IR-GAUGE-02',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('bearing-bore-1', 'bore_grinder', 680, 505, 13, {
        deviceName: 'Bore Grinder 1',
        deviceCode: 'BORE-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('bearing-bore-2', 'bore_grinder', 680, 640, 14, {
        deviceName: 'Bore Grinder 2',
        deviceCode: 'BORE-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 30,
        outputBufferCapacity: 25,
      }),
      makeNode('bearing-bore-gauge-1', 'general_gauge', 850, 505, 15, {
        deviceName: 'Bore Gauge 1',
        deviceShortName: '检测',
        deviceCode: 'BORE-GAUGE-01',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('bearing-bore-gauge-2', 'general_gauge', 850, 640, 16, {
        deviceName: 'Bore Gauge 2',
        deviceShortName: '检测',
        deviceCode: 'BORE-GAUGE-02',
        batchSize: 1,
        processTimeSec: 3,
        station1ProcessTimeSec: 3,
      }),
      makeNode('bearing-sf-or-1', 'superfinishing', 680, 40, 17, {
        deviceName: 'OR Superfinishing 1',
        deviceCode: 'SF-OR-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 35,
        outputBufferCapacity: 30,
      }),
      makeNode('bearing-sf-or-2', 'superfinishing', 680, 175, 18, {
        deviceName: 'OR Superfinishing 2',
        deviceCode: 'SF-OR-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 35,
        outputBufferCapacity: 30,
      }),
      makeNode('bearing-sf-ir-1', 'small_superfinishing', 1020, 505, 19, {
        deviceName: 'IR Superfinishing 1',
        deviceShortName: '小超',
        deviceCode: 'SF-IR-01',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 35,
        outputBufferCapacity: 30,
      }),
      makeNode('bearing-sf-ir-2', 'small_superfinishing', 1020, 640, 20, {
        deviceName: 'IR Superfinishing 2',
        deviceShortName: '小超',
        deviceCode: 'SF-IR-02',
        batchSize: 1,
        processTimeSec: 13,
        station1ProcessTimeSec: 13,
        inputBufferCapacity: 35,
        outputBufferCapacity: 30,
      }),
      makeNode('bearing-dry-or', 'spin_dryer', 850, 110, 21, {
        deviceName: 'Big Ring Spin Dryer',
        deviceShortName: 'DRY-OR',
        deviceCode: 'DRY-OR-01',
        inputBufferCapacity: 80,
        outputBufferCapacity: 120,
        dryerColumnBatchSize: 5,
        dryerColumnCount: 5,
        dryerDryTimeSec: 35,
      }),
      makeNode('bearing-dry-ir', 'spin_dryer', 1190, 500, 22, {
        deviceName: 'Small Ring Spin Dryer',
        deviceShortName: 'DRY-IR',
        deviceCode: 'DRY-IR-01',
        inputBufferCapacity: 80,
        outputBufferCapacity: 120,
        dryerColumnBatchSize: 5,
        dryerColumnCount: 5,
        dryerDryTimeSec: 35,
      }),
      makeNode('bearing-asm-store', 'assembly_storage', 1360, 335, 23),
      makeNode('bearing-asm-wash-big', 'assembly_cleaner', 1530, 170, 24, {
        deviceShortName: 'WASH-B',
        materialKind: 'big_ring',
        cleanerLaneCount: 1,
        cleanerLaneCapacity: 20,
        cleanerPushIntervalSec: 2.5,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 3,
      }),
      makeNode('bearing-asm-wash-small', 'assembly_cleaner', 1530, 430, 25, {
        deviceShortName: 'WASH-S',
        materialKind: 'small_ring',
        cleanerLaneCount: 1,
        cleanerLaneCapacity: 25,
        cleanerPushIntervalSec: 2.5,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 3,
      }),
      makeNode('bearing-asm-eddy-big', 'eddy_check', 1700, 170, 26, { deviceShortName: 'EDDY-B', materialKind: 'big_ring' }),
      makeNode('bearing-asm-eddy-small', 'eddy_check', 1700, 430, 27, { deviceShortName: 'EDDY-S', materialKind: 'small_ring' }),
      makeNode('bearing-asm-size-big', 'dimension_check', 1870, 170, 28, { deviceShortName: 'SIZE-B', materialKind: 'big_ring' }),
      makeNode('bearing-asm-size-small', 'dimension_check', 1870, 430, 29, { deviceShortName: 'SIZE-S', materialKind: 'small_ring' }),
      makeNode('bearing-asm-pair', 'pairing_station', 2040, 300, 30),
      makeNode('bearing-asm-rivet', 'riveting_station', 2210, 300, 31),
      makeNode('bearing-asm-wash-1', 'assembly_cleaner', 2380, 300, 32, {
        deviceShortName: 'WASH-2CH',
        cleanerLaneCount: 2,
        cleanerLaneCapacity: 24,
        cleanerPushIntervalSec: 8.4,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 8.4,
      }),
      makeNode('bearing-asm-flex', 'flexibility_check', 2550, 300, 33),
      makeNode('bearing-asm-vib-open', 'vibration_check', 2720, 300, 34, { deviceShortName: 'VIB-OPEN' }),
      makeNode('bearing-asm-wash-2', 'assembly_cleaner', 2720, 525, 35, {
        deviceShortName: 'WASH-2',
        cleanerLaneCount: 2,
        cleanerLaneCapacity: 24,
        cleanerPushIntervalSec: 8.4,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 8.4,
      }),
      makeNode('bearing-asm-dryer', 'spin_dryer', 2550, 525, 36, {
        deviceShortName: 'DRY-ASM',
        dryerColumnBatchSize: 4,
        dryerColumnCount: 4,
        dryerDryTimeSec: 17,
        inputBufferCapacity: 80,
        outputBufferCapacity: 80,
      }),
      makeNode('bearing-asm-vib-final', 'vibration_check', 2380, 525, 37, { deviceShortName: 'VIB-FIN' }),
      makeNode('bearing-asm-grease', 'grease_injection', 2210, 525, 38),
      makeNode('bearing-asm-cap', 'cap_press', 2040, 525, 39),
      makeNode('bearing-asm-vib-closed', 'vibration_check', 1870, 525, 40, { deviceShortName: 'VIB-CLOSE' }),
      makeNode('bearing-asm-visual', 'visual_check', 1700, 650, 41),
      makeNode('bearing-asm-manual', 'manual_buffer', 1530, 650, 42),
      makeNode('bearing-asm-rust', 'rust_proof', 1360, 650, 43),
      makeNode('bearing-asm-pack', 'packing_sink', 1190, 650, 44),
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
        id: `bearing-edge-${source}-${target}`,
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
      shape: 'orthogonal',
    };

    const edges: FactoryEdge[] = [
      edge('bearing-feed', 'bearing-feed-or-gauge', 'FEED-OR Gauge', 'conveyor', { ...conveyorDefaults, sourceHandle: 'out-1' }),
      edge('bearing-feed', 'bearing-feed-ir-gauge', 'FEED-IR Gauge', 'conveyor', { ...conveyorDefaults, sourceHandle: 'out-2' }),
      edge('bearing-feed-or-gauge', 'bearing-or-1', 'ARM-FEED-OR', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-FEED-OR' }),
      edge('bearing-feed-or-gauge', 'bearing-or-2', 'ARM-FEED-OR', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-FEED-OR' }),
      edge('bearing-feed-ir-gauge', 'bearing-ir-1', 'ARM-FEED-IR', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-FEED-IR' }),
      edge('bearing-feed-ir-gauge', 'bearing-ir-2', 'ARM-FEED-IR', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-FEED-IR' }),
      edge('bearing-or-1', 'bearing-or-gauge-1', 'OR-01 Gauge', 'conveyor', conveyorDefaults),
      edge('bearing-or-2', 'bearing-or-gauge-2', 'OR-02 Gauge', 'conveyor', conveyorDefaults),
      edge('bearing-or-gauge-1', 'bearing-sf-or-1', 'ARM-OR-SF', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-OR-SF' }),
      edge('bearing-or-gauge-1', 'bearing-sf-or-2', 'ARM-OR-SF', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-OR-SF' }),
      edge('bearing-or-gauge-2', 'bearing-sf-or-1', 'ARM-OR-SF', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-OR-SF' }),
      edge('bearing-or-gauge-2', 'bearing-sf-or-2', 'ARM-OR-SF', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-OR-SF' }),
      edge('bearing-ir-1', 'bearing-ir-gauge-1', 'IR-01 Gauge', 'conveyor', conveyorDefaults),
      edge('bearing-ir-2', 'bearing-ir-gauge-2', 'IR-02 Gauge', 'conveyor', conveyorDefaults),
      edge('bearing-ir-gauge-1', 'bearing-bore-1', 'ARM-IR-BORE', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-IR-BORE' }),
      edge('bearing-ir-gauge-1', 'bearing-bore-2', 'ARM-IR-BORE', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-IR-BORE' }),
      edge('bearing-ir-gauge-2', 'bearing-bore-1', 'ARM-IR-BORE', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-IR-BORE' }),
      edge('bearing-ir-gauge-2', 'bearing-bore-2', 'ARM-IR-BORE', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-IR-BORE' }),
      edge('bearing-bore-1', 'bearing-bore-gauge-1', 'BORE-01 Gauge', 'conveyor', conveyorDefaults),
      edge('bearing-bore-2', 'bearing-bore-gauge-2', 'BORE-02 Gauge', 'conveyor', conveyorDefaults),
      edge('bearing-bore-gauge-1', 'bearing-sf-ir-1', 'ARM-BORE-SF', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-BORE-SF' }),
      edge('bearing-bore-gauge-1', 'bearing-sf-ir-2', 'ARM-BORE-SF', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-BORE-SF' }),
      edge('bearing-bore-gauge-2', 'bearing-sf-ir-1', 'ARM-BORE-SF', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-BORE-SF' }),
      edge('bearing-bore-gauge-2', 'bearing-sf-ir-2', 'ARM-BORE-SF', 'loader_arm', { ...armDefaults, armGroupId: 'ARM-BORE-SF' }),
      edge('bearing-sf-or-1', 'bearing-dry-or', 'SF-OR -> DRY', 'conveyor', { ...conveyorDefaults, travelTimeSec: 3 }),
      edge('bearing-sf-or-2', 'bearing-dry-or', 'SF-OR -> DRY', 'conveyor', { ...conveyorDefaults, travelTimeSec: 3 }),
      edge('bearing-sf-ir-1', 'bearing-dry-ir', 'SF-IR -> DRY', 'conveyor', { ...conveyorDefaults, travelTimeSec: 3 }),
      edge('bearing-sf-ir-2', 'bearing-dry-ir', 'SF-IR -> DRY', 'conveyor', { ...conveyorDefaults, travelTimeSec: 3 }),
      edge('bearing-dry-or', 'bearing-asm-store', 'OR main line -> ASM', 'conveyor', {
        ...mainLineConveyor,
        targetHandle: 'in-1',
      }),
      edge('bearing-dry-ir', 'bearing-asm-store', 'IR main line -> ASM', 'conveyor', {
        ...mainLineConveyor,
        targetHandle: 'in-2',
      }),
      edge('bearing-asm-store', 'bearing-asm-wash-big', 'ASM-B -> WASH', 'conveyor', {
        ...assemblyConveyor,
        sourceHandle: 'out-1',
      }),
      edge('bearing-asm-store', 'bearing-asm-wash-small', 'ASM-S -> WASH', 'conveyor', {
        ...assemblyConveyor,
        sourceHandle: 'out-2',
      }),
      edge('bearing-asm-wash-big', 'bearing-asm-eddy-big', 'WASH-B -> EDDY', 'conveyor', assemblyConveyor),
      edge('bearing-asm-wash-small', 'bearing-asm-eddy-small', 'WASH-S -> EDDY', 'conveyor', assemblyConveyor),
      edge('bearing-asm-eddy-big', 'bearing-asm-size-big', 'EDDY-B -> SIZE', 'conveyor', assemblyConveyor),
      edge('bearing-asm-eddy-small', 'bearing-asm-size-small', 'EDDY-S -> SIZE', 'conveyor', assemblyConveyor),
      edge('bearing-asm-size-big', 'bearing-asm-pair', 'SIZE-B -> PAIR', 'conveyor', {
        ...assemblyConveyor,
        targetHandle: 'in-1',
      }),
      edge('bearing-asm-size-small', 'bearing-asm-pair', 'SIZE-S -> PAIR', 'conveyor', {
        ...assemblyConveyor,
        targetHandle: 'in-2',
      }),
      edge('bearing-asm-pair', 'bearing-asm-rivet', 'PAIR -> RIVET', 'conveyor', assemblyConveyor),
      edge('bearing-asm-rivet', 'bearing-asm-wash-1', 'RIVET -> WASH-1', 'conveyor', assemblyConveyor),
      edge('bearing-asm-wash-1', 'bearing-asm-flex', 'WASH-1 -> FLEX', 'conveyor', assemblyConveyor),
      edge('bearing-asm-flex', 'bearing-asm-vib-open', 'FLEX -> VIB-OPEN', 'conveyor', assemblyConveyor),
      edge('bearing-asm-vib-open', 'bearing-asm-wash-2', 'VIB-OPEN -> WASH-2', 'conveyor', assemblyConveyor),
      edge('bearing-asm-wash-2', 'bearing-asm-dryer', 'WASH-2 -> DRY-ASM', 'conveyor', assemblyConveyor),
      edge('bearing-asm-dryer', 'bearing-asm-vib-final', 'DRY-ASM -> VIB-FIN', 'conveyor', assemblyConveyor),
      edge('bearing-asm-vib-final', 'bearing-asm-grease', 'VIB-FIN -> GREASE', 'conveyor', assemblyConveyor),
      edge('bearing-asm-grease', 'bearing-asm-cap', 'GREASE -> CAP', 'conveyor', assemblyConveyor),
      edge('bearing-asm-cap', 'bearing-asm-vib-closed', 'CAP -> VIB-CLOSE', 'conveyor', assemblyConveyor),
      edge('bearing-asm-vib-closed', 'bearing-asm-visual', 'VIB-CLOSE -> VISUAL', 'conveyor', assemblyConveyor),
      edge('bearing-asm-visual', 'bearing-asm-manual', 'VISUAL -> MANUAL', 'conveyor', assemblyConveyor),
      edge('bearing-asm-manual', 'bearing-asm-rust', 'MANUAL -> RUST', 'conveyor', assemblyConveyor),
      edge('bearing-asm-rust', 'bearing-asm-pack', 'RUST -> PACK', 'conveyor', assemblyConveyor),
    ];

    const scenario: SavedScenarioRecord = {
      id: `scenario-${nanoid()}`,
      name: 'Bearing Raceway OR/IR/SF/BORE/Dryer Demo',
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
      logs: ['Bearing raceway scenario generated and saved to localStorage.', ...state.logs].slice(0, 80),
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
      makeNode('asm-big-line', 'material_source', 0, 80, 1, {
        deviceName: 'Post-grind big ring main line',
        deviceShortName: 'OR LINE',
        materialKind: 'big_ring',
        output1MaterialKind: 'big_ring',
        feedBatchSize: 1,
        feedIntervalSec: 3,
        outputBufferCapacity: 100,
      }),
      makeNode('asm-small-line', 'material_source', 0, 260, 2, {
        deviceName: 'Post-grind small ring main line',
        deviceShortName: 'IR LINE',
        materialKind: 'small_ring',
        output1MaterialKind: 'small_ring',
        feedBatchSize: 1,
        feedIntervalSec: 3,
        outputBufferCapacity: 100,
      }),
      makeNode('asm-store', 'assembly_storage', 250, 170, 3),
      makeNode('asm-wash-big', 'assembly_cleaner', 520, 70, 4, {
        deviceShortName: 'WASH-B',
        materialKind: 'big_ring',
        cleanerLaneCount: 1,
        cleanerLaneCapacity: 20,
        cleanerPushIntervalSec: 2.5,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 3,
      }),
      makeNode('asm-wash-small', 'assembly_cleaner', 520, 270, 5, {
        deviceShortName: 'WASH-S',
        materialKind: 'small_ring',
        cleanerLaneCount: 1,
        cleanerLaneCapacity: 25,
        cleanerPushIntervalSec: 2.5,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 3,
      }),
      makeNode('asm-eddy-big', 'eddy_check', 790, 70, 6, { deviceShortName: 'EDDY-B', materialKind: 'big_ring' }),
      makeNode('asm-eddy-small', 'eddy_check', 790, 270, 7, { deviceShortName: 'EDDY-S', materialKind: 'small_ring' }),
      makeNode('asm-size-big', 'dimension_check', 1060, 70, 8, { deviceShortName: 'SIZE-B', materialKind: 'big_ring' }),
      makeNode('asm-size-small', 'dimension_check', 1060, 270, 9, { deviceShortName: 'SIZE-S', materialKind: 'small_ring' }),
      makeNode('asm-pair', 'pairing_station', 1330, 170, 10),
      makeNode('asm-rivet', 'riveting_station', 1600, 170, 11),
      makeNode('asm-wash-1', 'assembly_cleaner', 1870, 170, 12, {
        deviceShortName: 'WASH-2CH',
        cleanerLaneCount: 2,
        cleanerLaneCapacity: 24,
        cleanerPushIntervalSec: 8.4,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 8.4,
      }),
      makeNode('asm-flex', 'flexibility_check', 2140, 170, 13),
      makeNode('asm-vib-open', 'vibration_check', 2410, 170, 14, { deviceShortName: 'VIB-OPEN' }),
      makeNode('asm-wash-2', 'assembly_cleaner', 2680, 170, 15, {
        deviceShortName: 'WASH-2',
        cleanerLaneCount: 2,
        cleanerLaneCapacity: 24,
        cleanerPushIntervalSec: 8.4,
        cleanerAirBatchSize: 5,
        cleanerAirTimeSec: 8.4,
      }),
      makeNode('asm-dryer', 'spin_dryer', 2950, 170, 16, {
        deviceShortName: 'DRY-ASM',
        dryerColumnBatchSize: 4,
        dryerColumnCount: 4,
        dryerDryTimeSec: 17,
        inputBufferCapacity: 80,
        outputBufferCapacity: 80,
      }),
      makeNode('asm-vib-final', 'vibration_check', 3220, 170, 17, { deviceShortName: 'VIB-FIN' }),
      makeNode('asm-grease', 'grease_injection', 3490, 170, 18),
      makeNode('asm-cap', 'cap_press', 3760, 170, 19),
      makeNode('asm-vib-closed', 'vibration_check', 4030, 170, 20, { deviceShortName: 'VIB-CLOSE' }),
      makeNode('asm-visual', 'visual_check', 4300, 170, 21),
      makeNode('asm-manual', 'manual_buffer', 4570, 170, 22),
      makeNode('asm-rust', 'rust_proof', 4840, 170, 23),
      makeNode('asm-pack', 'packing_sink', 5110, 170, 24),
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
      edge('asm-edge-big-to-store', 'asm-big-line', 'asm-store', { targetHandle: 'in-1', data: { label: 'Big main line', travelTimeSec: 3, lineBufferCapacity: 100 } }),
      edge('asm-edge-small-to-store', 'asm-small-line', 'asm-store', { targetHandle: 'in-2', data: { label: 'Small main line', travelTimeSec: 3, lineBufferCapacity: 100 } }),
      edge('asm-edge-store-big-wash', 'asm-store', 'asm-wash-big', { sourceHandle: 'out-1', data: { label: 'Store big feed', ...fast } }),
      edge('asm-edge-store-small-wash', 'asm-store', 'asm-wash-small', { sourceHandle: 'out-2', data: { label: 'Store small feed', ...fast } }),
      edge('asm-edge-wash-big-eddy', 'asm-wash-big', 'asm-eddy-big', { data: { label: 'Wash B -> Eddy B', ...normal } }),
      edge('asm-edge-wash-small-eddy', 'asm-wash-small', 'asm-eddy-small', { data: { label: 'Wash S -> Eddy S', ...normal } }),
      edge('asm-edge-eddy-big-size', 'asm-eddy-big', 'asm-size-big', { data: { label: 'Eddy B -> Size B', ...normal } }),
      edge('asm-edge-eddy-small-size', 'asm-eddy-small', 'asm-size-small', { data: { label: 'Eddy S -> Size S', ...normal } }),
      edge('asm-edge-size-big-pair', 'asm-size-big', 'asm-pair', { targetHandle: 'in-1', data: { label: 'Big ring to pair', ...normal } }),
      edge('asm-edge-size-small-pair', 'asm-size-small', 'asm-pair', { targetHandle: 'in-2', data: { label: 'Small ring to pair', ...normal } }),
      edge('asm-edge-pair-rivet', 'asm-pair', 'asm-rivet', { data: { label: 'Pair -> Rivet', ...normal } }),
      edge('asm-edge-rivet-wash1', 'asm-rivet', 'asm-wash-1', { data: { label: 'Rivet -> Wash', ...normal } }),
      edge('asm-edge-wash1-flex', 'asm-wash-1', 'asm-flex', { data: { label: 'Wash -> Flex', ...normal } }),
      edge('asm-edge-flex-vib-open', 'asm-flex', 'asm-vib-open', { data: { label: 'Flex -> Vibration', ...normal } }),
      edge('asm-edge-vib-open-wash2', 'asm-vib-open', 'asm-wash-2', { data: { label: 'Open vib -> Wash', ...normal } }),
      edge('asm-edge-wash2-dryer', 'asm-wash-2', 'asm-dryer', { data: { label: 'Wash -> Dryer', ...normal } }),
      edge('asm-edge-dryer-vib-final', 'asm-dryer', 'asm-vib-final', { data: { label: 'Dry -> Vibration', ...normal } }),
      edge('asm-edge-vib-final-grease', 'asm-vib-final', 'asm-grease', { data: { label: 'Vibration -> Grease', ...normal } }),
      edge('asm-edge-grease-cap', 'asm-grease', 'asm-cap', { data: { label: 'Grease -> Cap', ...normal } }),
      edge('asm-edge-cap-vib-closed', 'asm-cap', 'asm-vib-closed', { data: { label: 'Cap -> Closed vib', ...normal } }),
      edge('asm-edge-vib-closed-visual', 'asm-vib-closed', 'asm-visual', { data: { label: 'Closed vib -> Visual', ...normal } }),
      edge('asm-edge-visual-manual', 'asm-visual', 'asm-manual', { data: { label: 'Visual -> Manual table', ...normal } }),
      edge('asm-edge-manual-rust', 'asm-manual', 'asm-rust', { data: { label: 'Manual -> Rust proof', ...normal } }),
      edge('asm-edge-rust-pack', 'asm-rust', 'asm-pack', { data: { label: 'Rust proof -> Pack', ...normal } }),
    ];

    const scenario: SavedScenarioRecord = {
      id: `scenario-${nanoid()}`,
      name: 'Assembly line demo',
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
