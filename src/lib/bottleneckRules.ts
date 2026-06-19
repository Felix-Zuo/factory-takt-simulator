import type { BottleneckIssue, FactoryEdge, FactoryNode, StageKey } from '../types/factory';

export const CORE_STAGES = new Set<StageKey>([
  'process_a',
  'finish_a',
  'process_b',
  'process_c',
  'finish_b',
  'join',
  'fasten',
  'post_process',
]);
const SUPPORT_STAGES = new Set<StageKey>([
  'source',
  'merge_buffer',
  'wash_dry',
  'line_inspection',
  'general_inspection',
  'dryer',
  'packaging',
  'sink',
]);
export const CAPACITY_MARGIN = 0.95;
export const OVERSUPPLY_MARGIN = 1.1;
export const UTILIZATION_ALERT = 0.72;
const WAITING_RATE_ALERT = 0.12;
const BLOCKED_RATE_ALERT = 0.08;

export interface BottleneckCandidate {
  nodeId: string;
  label: string;
  capacity: number;
  priority: number;
  reason: string;
  recommendations: string[];
}

export const stageLabels: Record<StageKey, string> = {
  process_a: '工序A',
  finish_a: '精加工A',
  process_b: '工序B',
  process_c: '工序C',
  finish_b: '精加工B',
  general_inspection: '通用检测',
  dryer: '干燥',
  source: '料源',
  merge_buffer: '合流缓存',
  wash_dry: '清洗干燥',
  line_inspection: '在线检测',
  join: '合流工序',
  fasten: '紧固工序',
  post_process: '后处理',
  packaging: '包装',
  sink: '成品',
  other: '其他',
};

export const stageOrder: StageKey[] = [
  'source',
  'process_a',
  'finish_a',
  'process_b',
  'process_c',
  'finish_b',
  'merge_buffer',
  'wash_dry',
  'line_inspection',
  'join',
  'fasten',
  'post_process',
  'general_inspection',
  'dryer',
  'packaging',
  'sink',
  'other',
];

export const nodeCapacity = (node: FactoryNode) => node.data.metrics.theoreticalCapacityPerHour;
export const capacityText = (value: number) => `${value.toFixed(1)} pcs/h`;
export const nodeName = (node: FactoryNode) => node.data.params.deviceShortName;
export const nodeCode = (node: FactoryNode) => node.data.params.deviceCode || nodeName(node);

export const classifyStage = (node: FactoryNode): StageKey => {
  const params = node.data.params;
  if (params.deviceType === 'material_source' || params.deviceType === 'storage_feeder') return 'source';
  if (params.deviceType === 'merge_buffer') return 'merge_buffer';
  if (params.deviceType === 'wash_dry') return 'wash_dry';
  if (
    params.deviceType === 'inspection_a' ||
    params.deviceType === 'inspection_b' ||
    params.deviceType === 'functional_check' ||
    params.deviceType === 'performance_check' ||
    params.deviceType === 'visual_inspection'
  ) return 'line_inspection';
  if (params.deviceType === 'join_station') return 'join';
  if (params.deviceType === 'fasten_station') return 'fasten';
  if (
    params.deviceType === 'fill_station' ||
    params.deviceType === 'press_station' ||
    params.deviceType === 'surface_treatment'
  ) return 'post_process';
  if (params.deviceType === 'manual_buffer' || params.deviceType === 'packing_sink') return 'packaging';
  if (params.deviceType === 'process_a') return 'process_a';
  if (params.deviceType === 'process_b') return 'process_b';
  if (params.deviceType === 'process_c') return 'process_c';
  if (params.deviceType === 'finishing_b') return 'finish_b';
  if (params.deviceType === 'finishing') {
    const text = `${params.deviceShortName} ${params.deviceName} ${params.deviceCode}`.toLowerCase();
    return text.includes('b') || text.includes('part-b') ? 'finish_b' : 'finish_a';
  }
  if (params.deviceType === 'general_inspection') return 'general_inspection';
  if (params.deviceType === 'spin_dryer') return 'dryer';
  if (params.deviceType === 'finished_sink') return 'sink';
  return 'other';
};

export const isCoreNode = (node: FactoryNode) => CORE_STAGES.has(classifyStage(node));
export const isSupportNode = (node: FactoryNode) => SUPPORT_STAGES.has(classifyStage(node));

const isOutputFull = (node: FactoryNode) => {
  const p = node.data.params;
  return p.outputBufferCapacity > 0 && p.outputBufferCount >= p.outputBufferCapacity;
};

const isInputLow = (node: FactoryNode) => {
  const p = node.data.params;
  return p.inputBufferCapacity > 0 && p.inputBufferCount < Math.max(1, p.batchSize);
};

export const hasBlockedSignal = (node: FactoryNode) =>
  node.data.metrics.blockedRate >= BLOCKED_RATE_ALERT || node.data.metrics.totalBlockedTime >= 60 || isOutputFull(node);

export const hasWaitingSignal = (node: FactoryNode) =>
  node.data.metrics.waitingRate >= WAITING_RATE_ALERT || node.data.metrics.totalWaitingTime >= 60 || isInputLow(node);

const connectedNodes = (
  node: FactoryNode,
  edges: FactoryEdge[],
  nodeById: Map<string, FactoryNode>,
  direction: 'upstream' | 'downstream' | 'both',
) => {
  const result: FactoryNode[] = [];
  edges.forEach((edge) => {
    if (direction !== 'downstream' && edge.target === node.id) {
      const source = nodeById.get(edge.source);
      if (source) result.push(source);
    }
    if (direction !== 'upstream' && edge.source === node.id) {
      const target = nodeById.get(edge.target);
      if (target) result.push(target);
    }
  });
  return result;
};

export const connectedCoreNodes = (
  node: FactoryNode,
  edges: FactoryEdge[],
  nodeById: Map<string, FactoryNode>,
  direction: 'upstream' | 'downstream' | 'both' = 'both',
) => connectedNodes(node, edges, nodeById, direction).filter(isCoreNode);

export const supportDemand = (node: FactoryNode, edges: FactoryEdge[], nodeById: Map<string, FactoryNode>) =>
  connectedCoreNodes(node, edges, nodeById).reduce((max, item) => Math.max(max, nodeCapacity(item)), 0);

export const isSupportActuallyConstraining = (
  node: FactoryNode,
  edges: FactoryEdge[],
  nodeById: Map<string, FactoryNode>,
) => {
  if (!isSupportNode(node)) return false;
  const demand = supportDemand(node, edges, nodeById);
  if (demand <= 0 || nodeCapacity(node) >= demand * CAPACITY_MARGIN) return false;

  const downstreamIsWaiting = connectedCoreNodes(node, edges, nodeById, 'downstream').some(hasWaitingSignal);
  const upstreamIsBlocked = connectedCoreNodes(node, edges, nodeById, 'upstream').some(hasBlockedSignal);
  return node.data.metrics.utilization >= UTILIZATION_ALERT || hasBlockedSignal(node) || downstreamIsWaiting || upstreamIsBlocked;
};

export const edgeDemand = (source: FactoryNode, target: FactoryNode) => {
  const sourceCore = isCoreNode(source);
  const targetCore = isCoreNode(target);
  if (sourceCore && targetCore) return Math.min(nodeCapacity(source), nodeCapacity(target));
  if (sourceCore && isSupportNode(target)) return nodeCapacity(source);
  if (isSupportNode(source) && targetCore) return nodeCapacity(target);
  return Math.min(nodeCapacity(source), nodeCapacity(target));
};

export const shouldCheckSupportTarget = (
  target: FactoryNode,
  edges: FactoryEdge[],
  nodeById: Map<string, FactoryNode>,
) => !isSupportNode(target) || isSupportActuallyConstraining(target, edges, nodeById);

export const pushIssue = (issues: BottleneckIssue[], next: BottleneckIssue) => {
  if (!issues.some((item) => item.id === next.id)) issues.push(next);
};

export const nodeCandidate = (
  node: FactoryNode,
  edges: FactoryEdge[],
  nodeById: Map<string, FactoryNode>,
): BottleneckCandidate | null => {
  const capacity = nodeCapacity(node);
  if (capacity <= 0) return null;
  const stage = classifyStage(node);

  if (CORE_STAGES.has(stage)) {
    return {
      nodeId: node.id,
      label: nodeCode(node),
      capacity,
      priority: 0,
      reason: `${nodeCode(node)} 是主加工工序中当前有效能力最低的候选点，能力约 ${capacityText(capacity)}。`,
      recommendations: [
        `优先检查 ${nodeName(node)} 的单件节拍、并联设备数、修整和换耗材停机。`,
        `如果该工序前缓存长期满料或上料手等待下游空间，优先按该工序做节拍提升。`,
      ],
    };
  }

  if (isSupportActuallyConstraining(node, edges, nodeById)) {
    const demand = supportDemand(node, edges, nodeById);
    return {
      nodeId: node.id,
      label: nodeCode(node),
      capacity,
      priority: 1,
      reason: `${nodeCode(node)} 属于辅助/缓冲工序，但能力 ${capacityText(capacity)} 已低于相邻主工序需求 ${capacityText(demand)}。`,
      recommendations: [
        `只有当 ${nodeName(node)} 同时造成主加工工序等待或上游主加工堵料时，才按真实瓶颈处理。`,
        `提高该辅助工序节拍或扩大缓存前，先确认相邻主工序是否已经被拖慢。`,
      ],
    };
  }

  return null;
};
