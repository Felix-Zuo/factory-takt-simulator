import { mergeNodeParams } from './nodeConfig';
import type { DeviceParameters, FactoryEdge, FactoryNode } from '../types/factory';

export type ConfigBrushMode = 'same_type_takt' | 'line_takt' | 'same_type_ports' | 'same_type_full';

const TAKT_KEYS: Array<keyof DeviceParameters> = [
  'taktMode',
  'manualTaktSec',
  'batchSize',
  'processTimeSec',
  'station1Enabled',
  'station1BatchSize',
  'station1ProcessTimeSec',
  'station2Enabled',
  'station2BatchSize',
  'station2ProcessTimeSec',
  'machineCount',
  'availability',
  'yieldRate',
  'ngRate',
  'dressingIntervalUnits',
  'dressingDurationSec',
  'consumableIntervalUnits',
  'consumableChangeSec',
  'superfinishingMode',
  'firstPassProcessTimeSec',
  'secondPassProcessTimeSec',
];

const PORT_BUFFER_KEYS: Array<keyof DeviceParameters> = [
  'inputPortCount',
  'outputPortCount',
  'inputPortRules',
  'outputPortRules',
  'inputBufferCapacity',
  'outputBufferCapacity',
  'station1InputBufferCapacity',
  'station2InputBufferCapacity',
  'materialKind',
  'output1MaterialKind',
  'output2MaterialKind',
];

const FULL_KEYS: Array<keyof DeviceParameters> = [
  'enabled',
  ...TAKT_KEYS,
  ...PORT_BUFFER_KEYS,
  'shiftHours',
  'shiftsPerDay',
  'plannedOutput',
  'storageCapacity',
  'feedBatchSize',
  'feedIntervalSec',
  'dryerColumnBatchSize',
  'dryerColumnCount',
  'dryerDryTimeSec',
];

const pick = (params: DeviceParameters, keys: Array<keyof DeviceParameters>) =>
  Object.fromEntries(keys.map((key) => [key, structuredClone(params[key])])) as Partial<DeviceParameters>;

const lineTaktTypes = new Set<DeviceParameters['deviceType']>([
  'or_grinder',
  'ir_grinder',
  'bore_grinder',
  'superfinishing',
  'small_superfinishing',
  'general_gauge',
]);

const handleIndex = (handleId?: string | null) => Number(handleId?.split('-')[1] ?? 1);

const isLineTaktTarget = (node: FactoryNode) => lineTaktTypes.has(node.data.params.deviceType);

const isTargetNode = (node: FactoryNode, source: FactoryNode, mode: ConfigBrushMode) =>
  node.id !== source.id && (mode === 'line_takt' ? isLineTaktTarget(node) : node.data.params.deviceType === source.data.params.deviceType);

const connectedNodeIds = (edges: FactoryEdge[], startNodeId: string) => {
  const seen = new Set([startNodeId]);
  const queue = [startNodeId];
  while (queue.length > 0) {
    const current = queue.shift();
    edges.forEach((edge) => {
      if (edge.source !== current && edge.target !== current) return;
      const next = edge.source === current ? edge.target : edge.source;
      if (seen.has(next)) return;
      seen.add(next);
      queue.push(next);
    });
  }
  return seen;
};

export const getConfigBrushTargetCount = (nodes: FactoryNode[], sourceNodeId: string, mode: ConfigBrushMode) => {
  const source = nodes.find((node) => node.id === sourceNodeId);
  return source ? nodes.filter((node) => isTargetNode(node, source, mode)).length : 0;
};

export const sanitizeEdgesAfterConfigBrush = (edges: FactoryEdge[], nodes: FactoryNode[]) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return edges.filter((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return false;
    return (
      handleIndex(edge.sourceHandle) <= source.data.params.outputPortCount &&
      handleIndex(edge.targetHandle) <= target.data.params.inputPortCount
    );
  });
};

export const applyConfigBrush = (
  nodes: FactoryNode[],
  sourceNodeId: string,
  mode: ConfigBrushMode,
): { nodes: FactoryNode[]; changed: number; label: string } => {
  const source = nodes.find((node) => node.id === sourceNodeId);
  if (!source) return { nodes, changed: 0, label: '' };

  const keys = mode === 'same_type_ports' ? PORT_BUFFER_KEYS : mode === 'same_type_full' ? FULL_KEYS : TAKT_KEYS;
  const patch = pick(source.data.params, keys);
  let changed = 0;

  const nextNodes = nodes.map((node) => {
    if (node.id === sourceNodeId) return node;
    if (!isTargetNode(node, source, mode)) return node;
    changed += 1;
    return mergeNodeParams(node, patch);
  });

  return { nodes: nextNodes, changed, label: source.data.params.deviceShortName };
};

export const applyConfigBrushToTarget = (
  nodes: FactoryNode[],
  edges: FactoryEdge[],
  sourceNodeId: string,
  targetNodeId: string,
  mode: ConfigBrushMode,
): { nodes: FactoryNode[]; edges: FactoryEdge[]; changed: number; label: string; reason?: string } => {
  const source = nodes.find((node) => node.id === sourceNodeId);
  const target = nodes.find((node) => node.id === targetNodeId);
  if (!source || !target || source.id === target.id) {
    return { nodes, edges, changed: 0, label: source?.data.params.deviceShortName ?? '', reason: 'No target selected.' };
  }

  const keys = mode === 'same_type_ports' ? PORT_BUFFER_KEYS : mode === 'same_type_full' ? FULL_KEYS : TAKT_KEYS;
  const patch = pick(source.data.params, keys);
  const targetIds =
    mode === 'line_takt'
      ? connectedNodeIds(edges, target.id)
      : new Set([target.id]);
  let changed = 0;

  const nextNodes = nodes.map((node) => {
    if (node.id === source.id || !targetIds.has(node.id)) return node;
    if (!isTargetNode(node, source, mode)) return node;
    changed += 1;
    return mergeNodeParams(node, patch);
  });
  const nextEdges = sanitizeEdgesAfterConfigBrush(edges, nextNodes);

  return {
    nodes: nextNodes,
    edges: nextEdges,
    changed,
    label: source.data.params.deviceShortName,
    reason: changed === 0 ? 'Target type does not match this brush.' : undefined,
  };
};

export const configBrushLabel = (mode: ConfigBrushMode, language: 'zh-CN' | 'en') => {
  const zh = language === 'zh-CN';
  if (mode === 'same_type_takt') return zh ? '同类节拍刷' : 'Same-type takt brush';
  if (mode === 'line_takt') return zh ? '整线节拍刷' : 'Line takt brush';
  if (mode === 'same_type_ports') return zh ? '同类端口缓存刷' : 'Same-type port/buffer brush';
  return zh ? '同类完整参数刷' : 'Same-type full config brush';
};
