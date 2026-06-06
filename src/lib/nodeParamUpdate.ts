import { mergeNodeParams } from './nodeConfig';
import { clampPortCount } from './portRules';
import type { DeviceParameters, FactoryEdge, FactoryNode, SelectedPort } from '../types/factory';

interface NodeParamUpdateState {
  nodes: FactoryNode[];
  edges: FactoryEdge[];
  selectedEdgeId: string | null;
  selectedPort: SelectedPort | null;
  pendingConnectFrom: { nodeId: string; handleId: string } | null;
}

const handleIndex = (handleId?: string | null) => Number(handleId?.split('-')[1] ?? 1);

export const applyNodeParamUpdate = (
  state: NodeParamUpdateState,
  nodeId: string,
  patch: Partial<DeviceParameters>,
) => {
  const normalizedPatch = { ...patch };
  if (patch.inputPortCount !== undefined) normalizedPatch.inputPortCount = clampPortCount(patch.inputPortCount);
  if (patch.outputPortCount !== undefined) normalizedPatch.outputPortCount = clampPortCount(patch.outputPortCount);

  const nodes = state.nodes.map((node) => (node.id === nodeId ? mergeNodeParams(node, normalizedPatch) : node));
  const changed = nodes.find((node) => node.id === nodeId);
  const edges = changed
    ? state.edges.filter((edge) => {
        if (edge.source === nodeId) return handleIndex(edge.sourceHandle) <= changed.data.params.outputPortCount;
        if (edge.target === nodeId) return handleIndex(edge.targetHandle) <= changed.data.params.inputPortCount;
        return true;
      })
    : state.edges;

  const selectedPort =
    state.selectedPort?.nodeId === nodeId && changed
      ? state.selectedPort.side === 'input' && handleIndex(state.selectedPort.handleId) <= changed.data.params.inputPortCount
        ? state.selectedPort
        : state.selectedPort.side === 'output' &&
            handleIndex(state.selectedPort.handleId) <= changed.data.params.outputPortCount
          ? state.selectedPort
          : null
      : state.selectedPort;
  const selectedEdgeId =
    state.selectedEdgeId && edges.some((edge) => edge.id === state.selectedEdgeId) ? state.selectedEdgeId : null;
  const pendingConnectFrom =
    state.pendingConnectFrom?.nodeId === nodeId && changed
      ? handleIndex(state.pendingConnectFrom.handleId) <= changed.data.params.outputPortCount
        ? state.pendingConnectFrom
        : null
      : state.pendingConnectFrom;

  return { nodes, edges, selectedPort, selectedEdgeId, pendingConnectFrom };
};

