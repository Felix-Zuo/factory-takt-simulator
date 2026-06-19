import { useFactoryStore } from '../store/factoryStore';
import type { AppSettings, DeviceParameters, DeviceType, FactoryEdge, FactoryNode, FlowEdgeData } from '../types/factory';
import { APP_VERSION } from '../version';

type AgentCommand =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'reset' }
  | { type: 'setSpeed'; speed: number }
  | { type: 'addDevice'; deviceType: DeviceType; x: number; y: number }
  | { type: 'selectNode'; nodeId: string | null }
  | { type: 'selectEdge'; edgeId: string | null }
  | { type: 'updateNode'; nodeId: string; patch: Partial<DeviceParameters> }
  | { type: 'updateEdge'; edgeId: string; patch: Partial<FlowEdgeData> }
  | { type: 'updateSettings'; patch: Partial<AppSettings> }
  | { type: 'saveScenario'; name?: string }
  | { type: 'loadScenario'; scenarioId?: string }
  | { type: 'importScenario'; json: string; name?: string }
  | { type: 'runBackgroundSimulation' }
  | { type: 'createDemoScenario' }
  | { type: 'createFullLineExample' }
  | { type: 'createAssemblyExample' };

export interface FactoryTaktAgentSnapshot {
  version: string;
  elapsedSec: number;
  isRunning: boolean;
  speed: number;
  nodes: FactoryNode[];
  edges: FactoryEdge[];
  settings: AppSettings;
  summary: ReturnType<typeof useFactoryStore.getState>['summary'];
  latestReport: string;
}

export interface FactoryTaktAgentApi {
  version: string;
  getSnapshot: () => FactoryTaktAgentSnapshot;
  runCommand: (command: AgentCommand) => unknown;
  listScenarios: () => ReturnType<typeof useFactoryStore.getState>['listSavedScenarios'] extends () => infer R ? R : never;
  exportScenarioObject: () => Pick<FactoryTaktAgentSnapshot, 'nodes' | 'edges' | 'elapsedSec' | 'speed' | 'settings'>;
  subscribe: (callback: (snapshot: FactoryTaktAgentSnapshot) => void) => () => void;
}

declare global {
  interface Window {
    FactoryTaktAgent?: FactoryTaktAgentApi;
  }
}

const snapshot = (): FactoryTaktAgentSnapshot => {
  const state = useFactoryStore.getState();
  return {
    version: APP_VERSION,
    elapsedSec: state.elapsedSec,
    isRunning: state.isRunning,
    speed: state.speed,
    nodes: state.nodes,
    edges: state.edges,
    settings: state.settings,
    summary: state.summary,
    latestReport: state.latestReport,
  };
};

const runCommand = (command: AgentCommand) => {
  const state = useFactoryStore.getState();
  switch (command.type) {
    case 'start':
      return state.start();
    case 'pause':
      return state.pause();
    case 'reset':
      return state.resetSimulation();
    case 'setSpeed':
      return state.setSpeed(command.speed);
    case 'addDevice':
      return state.addDevice(command.deviceType, { x: command.x, y: command.y });
    case 'selectNode':
      return state.selectNode(command.nodeId);
    case 'selectEdge':
      return state.selectEdge(command.edgeId);
    case 'updateNode':
      return state.updateNodeParams(command.nodeId, command.patch);
    case 'updateEdge':
      return state.updateEdgeData(command.edgeId, command.patch);
    case 'updateSettings':
      return state.updateSettings(command.patch);
    case 'saveScenario':
      return state.saveScenario(command.name);
    case 'loadScenario':
      return state.loadScenario(command.scenarioId);
    case 'importScenario':
      return state.importScenarioJson(command.json, command.name);
    case 'runBackgroundSimulation':
      return state.runBackgroundSimulation();
    case 'createDemoScenario':
      return state.createDemoScenario();
    case 'createFullLineExample':
      return state.createFullLineScenario();
    case 'createAssemblyExample':
      return state.createAssemblyScenario();
    default:
      return null;
  }
};

export function installFactoryTaktAgentBridge() {
  if (typeof window === 'undefined') return undefined;

  const api: FactoryTaktAgentApi = {
    version: APP_VERSION,
    getSnapshot: snapshot,
    runCommand,
    listScenarios: () => useFactoryStore.getState().listSavedScenarios(),
    exportScenarioObject: () => {
      const current = snapshot();
      return {
        nodes: current.nodes,
        edges: current.edges,
        elapsedSec: current.elapsedSec,
        speed: current.speed,
        settings: current.settings,
      };
    },
    subscribe: (callback) => {
      const unsubscribe = useFactoryStore.subscribe(() => callback(snapshot()));
      callback(snapshot());
      return unsubscribe;
    },
  };

  window.FactoryTaktAgent = api;
  window.dispatchEvent(new CustomEvent('factory-takt-agent-ready', { detail: { version: APP_VERSION } }));

  return () => {
    if (window.FactoryTaktAgent === api) delete window.FactoryTaktAgent;
  };
}
