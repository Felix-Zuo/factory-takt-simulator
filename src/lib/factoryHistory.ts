import type { FactoryEdge, FactoryNode } from '../types/factory';
import { buildSimulationSummary } from './analysis';

export interface FactoryHistorySnapshot {
  nodes: FactoryNode[];
  edges: FactoryEdge[];
  elapsedSec: number;
}

export interface HistorySource {
  nodes: FactoryNode[];
  edges: FactoryEdge[];
  elapsedSec: number;
}

export const createHistorySnapshot = (state: HistorySource): FactoryHistorySnapshot => ({
  nodes: structuredClone(state.nodes),
  edges: structuredClone(state.edges),
  elapsedSec: state.elapsedSec,
});

export const appendHistory = (
  past: FactoryHistorySnapshot[],
  snapshot: FactoryHistorySnapshot,
  limit = 60,
) => [...past, snapshot].slice(-limit);

export const isRouteOnlyEdgePatch = (patch: Record<string, unknown>) => {
  const keys = Object.keys(patch);
  return keys.length > 0 && keys.every((key) => key === 'routeOffsetX' || key === 'routeOffsetY');
};

export const shouldRecordNodeChanges = (changes: Array<{ type: string; dragging?: boolean }>) =>
  changes.some(
    (change) =>
      change.type === 'add' ||
      change.type === 'remove' ||
      (change.type === 'position' && change.dragging === false),
  );

export const shouldRecordEdgeChanges = (changes: Array<{ type: string }>) =>
  changes.some((change) => change.type === 'add' || change.type === 'remove' || change.type === 'reset');

export const restoreHistorySnapshot = (
  snapshot: FactoryHistorySnapshot,
  historyPast: FactoryHistorySnapshot[],
  historyFuture: FactoryHistorySnapshot[],
  logs: string[],
  message: string,
) => ({
  nodes: snapshot.nodes,
  edges: snapshot.edges,
  elapsedSec: snapshot.elapsedSec,
  isRunning: false,
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedPort: null,
  pendingConnectFrom: null,
  pendingConfigBrush: null,
  summary: buildSimulationSummary(snapshot.nodes, snapshot.edges, snapshot.elapsedSec),
  historyPast,
  historyFuture,
  logs: [message, ...logs].slice(0, 80),
});
