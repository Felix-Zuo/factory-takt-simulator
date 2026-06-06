import { calculateEdgeCapacityPerHour } from './takt';
import {
  CAPACITY_MARGIN,
  CORE_STAGES,
  OVERSUPPLY_MARGIN,
  UTILIZATION_ALERT,
  capacityText,
  classifyStage,
  edgeDemand,
  hasBlockedSignal,
  hasWaitingSignal,
  isCoreNode,
  isSupportActuallyConstraining,
  isSupportNode,
  nodeCandidate,
  nodeCapacity,
  nodeCode,
  nodeName,
  pushIssue,
  shouldCheckSupportTarget,
  stageLabels,
  stageOrder,
  type BottleneckCandidate as Candidate,
} from './bottleneckRules';
import type {
  BottleneckIssue,
  BottleneckResult,
  DeviceStatus,
  FactoryEdge,
  FactoryNode,
  SimulationSummary,
  StageAnalysis,
  StageKey,
} from '../types/factory';

// Bottleneck analysis combines static takt capacity with runtime symptoms.
// Support processes are only promoted when they actually constrain upstream or
// downstream flow, which keeps high-capacity buffers/checks from creating noise.
const statuses: DeviceStatus[] = [
  'idle',
  'running',
  'waiting_material',
  'blocked',
  'dressing',
  'changing_consumable',
  'stopped',
  'fault',
  'arm_wait_pick',
  'arm_wait_space',
  'transporting',
];

export const analyzeStages = (nodes: FactoryNode[]): StageAnalysis[] => {
  const groups = new Map<StageKey, FactoryNode[]>();

  nodes
    .filter((node) => node.data.params.enabled)
    .forEach((node) => {
      const key = classifyStage(node);
      groups.set(key, [...(groups.get(key) ?? []), node]);
    });

  return stageOrder
    .map((key) => {
      const stageNodes = groups.get(key) ?? [];
      if (stageNodes.length === 0) return null;

      const capacities = stageNodes.map((node) => node.data.metrics.theoreticalCapacityPerHour).filter((value) => value > 0);
      const totalCapacity = capacities.reduce((sum, value) => sum + value, 0);
      const avgTaktSec = totalCapacity > 0 ? 3600 / totalCapacity : 0;
      const totalOutput = stageNodes.reduce((sum, node) => sum + node.data.metrics.totalOutput, 0);
      const utilization =
        stageNodes.reduce((sum, node) => sum + node.data.metrics.utilization, 0) / Math.max(1, stageNodes.length);
      const slowest = [...stageNodes].sort(
        (a, b) => a.data.metrics.theoreticalCapacityPerHour - b.data.metrics.theoreticalCapacityPerHour,
      )[0];

      return {
        key,
        label: stageLabels[key],
        nodeIds: stageNodes.map((node) => node.id),
        capacityPerHour: totalCapacity,
        avgTaktSec,
        totalOutput,
        utilization,
        notes: slowest
          ? [
              `${slowest.data.params.deviceShortName} 是该阶段内能力最低点，约 ${capacityText(
                slowest.data.metrics.theoreticalCapacityPerHour,
              )}。`,
            ]
          : [],
      };
    })
    .filter(Boolean) as StageAnalysis[];
};

const edgeLabel = (edge: FactoryEdge, nodes: FactoryNode[]) => {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  return `${source?.data.params.deviceShortName ?? 'A'} -> ${target?.data.params.deviceShortName ?? 'B'}`;
};

const issue = (
  id: string,
  severity: BottleneckIssue['severity'],
  position: string,
  reason: string,
  risk: string,
  suggestions: string[],
): BottleneckIssue => ({ id, severity, position, reason, risk, suggestions });

export const analyzeBottleneck = (nodes: FactoryNode[], edges: FactoryEdge[]): BottleneckResult => {
  const activeNodes = nodes.filter(
    (node) => node.data.params.enabled && node.data.metrics.theoreticalCapacityPerHour > 0,
  );

  if (activeNodes.length === 0) {
    return {
      nodeId: null,
      label: 'No active equipment',
      reason: '尚无启用设备，无法判断瓶颈。',
      capacityPerHour: 0,
      lineBalanceRate: 0,
      recommendations: ['拖入设备并建立路线后再运行分析。'],
      issues: [],
    };
  }

  const nodeById = new Map(activeNodes.map((node) => [node.id, node]));
  const issues: BottleneckIssue[] = [];
  const edgeCandidates: Candidate[] = [];

  edges.forEach((edge) => {
    if (!edge.data) return;
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return;

    const sourceCapacity = nodeCapacity(source);
    const targetCapacity = nodeCapacity(target);
    const sourceCore = isCoreNode(source);
    const targetCore = isCoreNode(target);
    const targetConstrains = shouldCheckSupportTarget(target, edges, nodeById);
    const sourceConstrains = !isSupportNode(source) || isSupportActuallyConstraining(source, edges, nodeById);
    const label = edgeLabel(edge, nodes);
    const edgeKey = edge.data.transportType === 'loader_arm' && edge.data.armGroupId ? edge.data.armGroupId : edge.id;

    if (sourceCapacity > targetCapacity * OVERSUPPLY_MARGIN && (targetCore || targetConstrains)) {
      pushIssue(
        issues,
        issue(
          `downstream-${target.id}-${edgeKey}`,
          targetCore ? 'critical' : 'warning',
          nodeCode(target),
          `${nodeCode(target)} 能力 ${capacityText(targetCapacity)} 低于上游 ${nodeCode(source)} 的 ${capacityText(sourceCapacity)}。`,
          `${nodeName(source)} 后缓存或上料手可能出现等待下游空间；根因更可能在 ${nodeName(target)} 或其后段释放能力。`,
          [
            `将 ${nodeName(target)} 单件平均节拍压到 ${(3600 / Math.max(1, sourceCapacity)).toFixed(1)}s/件以内，或增加并联工位。`,
            `优先看 ${nodeName(target)} 的修整、换耗材、上下料等待和后缓存释放。`,
            '如果该节点是检测/甩干等辅助工序，只有它实际拖慢主加工时才需要扩容。',
          ],
        ),
      );
    }

    if (sourceCapacity < targetCapacity * CAPACITY_MARGIN && targetCore && sourceConstrains && hasWaitingSignal(target)) {
      pushIssue(
        issues,
        issue(
          `upstream-${source.id}-${edgeKey}`,
          sourceCore ? 'warning' : 'info',
          nodeCode(source),
          `${nodeCode(source)} 能力 ${capacityText(sourceCapacity)} 低于下游主工序 ${nodeCode(target)} 的需求 ${capacityText(targetCapacity)}。`,
          `${nodeName(target)} 出现有效待料时，才把上游供给不足作为问题；检测/料源自身空等不单独算瓶颈。`,
          [
            `提高 ${nodeName(source)} 的供给能力或降低触发批量。`,
            `检查 ${label} 的搬运节拍和下游前缓存是否让主加工断料。`,
          ],
        ),
      );
    }

    const required = edgeDemand(source, target);
    const linkCapacity = calculateEdgeCapacityPerHour(edge.data);
    const linkHasSignal =
      edge.data.utilization >= UTILIZATION_ALERT ||
      edge.data.waitSpaceTime >= 60 ||
      edge.data.waitPickTime >= 60 ||
      hasBlockedSignal(source) ||
      hasWaitingSignal(target);
    const supportTargetIsNoise = isSupportNode(target) && !isSupportActuallyConstraining(target, edges, nodeById);
    const linkIsConstraint = required > 0 && linkCapacity < required * CAPACITY_MARGIN && linkHasSignal && !supportTargetIsNoise;

    if (linkIsConstraint) {
      const candidate: Candidate = {
        nodeId: edge.id,
        label,
        capacity: linkCapacity,
        priority: targetCore || sourceCore ? 0 : 1,
        reason: `${label} 运输能力 ${capacityText(linkCapacity)} 低于相邻主节拍需求 ${capacityText(required)}。`,
        recommendations:
          edge.data.transportType === 'loader_arm'
            ? ['增加单次夹取数或减少取料/移动/放料/返回时间。', '检查机械手是否因下游空间不足长期停在上游。']
            : ['提高输送速度或单次运输数量。', '确认线体缓存不是在替代真实下游节拍问题。'],
      };
      edgeCandidates.push(candidate);
      pushIssue(
        issues,
        issue(
          `transport-${edgeKey}`,
          'critical',
          label,
          candidate.reason,
          '运输链路只有在能力低于主工序需求且伴随等待/堵料信号时，才作为真实瓶颈。',
          candidate.recommendations,
        ),
      );
    }

    if (
      edge.data.transportType !== 'loader_arm' &&
      edge.data.lineBufferCapacity > 0 &&
      edge.data.lineBufferCount >= edge.data.lineBufferCapacity &&
      (targetCore || isSupportActuallyConstraining(target, edges, nodeById))
    ) {
      pushIssue(
        issues,
        issue(
          `line-buffer-${edge.id}`,
          targetCore ? 'critical' : 'warning',
          label,
          `${label} 线体缓存已满：${edge.data.lineBufferCount}/${edge.data.lineBufferCapacity}。`,
          `${nodeName(source)} 的后缓存可能无法继续释放；若目标不是主加工工序，这通常只是下游主节拍偏慢的症状。`,
          [
            `先确认 ${nodeName(target)} 或其后段是否才是真正释放慢的点。`,
            `确认后再增加 ${label} 的线体缓存或降低单次运输数量。`,
          ],
        ),
      );
    }

    if (edge.data.transportType === 'loader_arm' && edge.data.waitSpaceTime > Math.max(60, edge.data.waitPickTime * 1.2)) {
      const severity = targetCore || isSupportActuallyConstraining(target, edges, nodeById) ? 'critical' : 'info';
      pushIssue(
        issues,
        issue(
          `arm-space-${edgeKey}`,
          severity,
          targetCore ? nodeCode(target) : label,
          `${label} 等待下游空间累计 ${edge.data.waitSpaceTime.toFixed(0)}s。`,
          targetCore
            ? `机械手停在上游侧不取料，说明 ${nodeName(target)} 或其后段释放偏慢。`
            : '目标是辅助/末端工序时，只有它拖慢主加工输出才视为瓶颈。',
          ['优先检查下游主加工工序节拍和后段释放，而不是直接把机械手判为瓶颈。'],
        ),
      );
    }

    if (edge.data.transportType === 'loader_arm' && edge.data.waitPickTime > Math.max(60, edge.data.waitSpaceTime * 1.2) && targetCore) {
      pushIssue(
        issues,
        issue(
          `arm-pick-${edgeKey}`,
          'warning',
          nodeCode(source),
          `${label} 等待取料累计 ${edge.data.waitPickTime.toFixed(0)}s。`,
          `${nodeName(target)} 是主加工工序，若同时待料，才说明上游供给不足。`,
          ['提高上游主工序产能或降低机械手触发批量。', '检查上游后缓存策略，避免小批量断供。'],
        ),
      );
    }
  });

  activeNodes.forEach((node) => {
    const stage = classifyStage(node);
    const supportConstrains = isSupportActuallyConstraining(node, edges, nodeById);

    if (CORE_STAGES.has(stage) && hasWaitingSignal(node) && node.data.metrics.utilization < UTILIZATION_ALERT) {
      pushIssue(
        issues,
        issue(
          `input-${node.id}`,
          'warning',
          nodeCode(node),
          `${nodeCode(node)} 是主加工工序，前缓存不足或待料时间偏高。`,
          '主加工工序待料会直接降低整线有效产出，需要追查上游供给和搬运节拍。',
          ['检查上游主工序能力、机械手触发批量和该工序前缓存补料频率。'],
        ),
      );
    }

    if ((CORE_STAGES.has(stage) || supportConstrains) && hasBlockedSignal(node)) {
      pushIssue(
        issues,
        issue(
          `output-${node.id}`,
          CORE_STAGES.has(stage) ? 'critical' : 'warning',
          nodeCode(node),
          `${nodeCode(node)} 后缓存接近或达到上限，堵料风险升高。`,
          CORE_STAGES.has(stage)
            ? '主加工工序堵料会直接造成有效产能损失。'
            : '辅助工序堵料只有在拖慢主加工时才作为真实瓶颈。',
          ['检查下游主节拍、连线搬运能力和后缓存释放。'],
        ),
      );
    }
  });

  const nodeCandidates = activeNodes
    .map((node) => nodeCandidate(node, edges, nodeById))
    .filter(Boolean) as Candidate[];
  const candidates = [...nodeCandidates, ...edgeCandidates].sort(
    (a, b) => a.priority - b.priority || a.capacity - b.capacity,
  );
  const bottleneck = candidates[0] ?? {
    nodeId: activeNodes[0].id,
    label: nodeCode(activeNodes[0]),
    capacity: nodeCapacity(activeNodes[0]),
    priority: 0,
    reason: `${nodeCode(activeNodes[0])} 暂作为当前能力最低点。`,
    recommendations: ['继续运行仿真或完善产线连接后再判断。'],
  };

  const coreStages = analyzeStages(activeNodes).filter((stage) => CORE_STAGES.has(stage.key) && stage.capacityPerHour > 0);
  const averageCapacity =
    coreStages.reduce((sum, item) => sum + item.capacityPerHour, 0) / Math.max(1, coreStages.length);
  const lineBalanceRate = averageCapacity > 0 ? bottleneck.capacity / averageCapacity : 0;
  const topIssue =
    issues.find((item) => item.severity === 'critical' && item.position === bottleneck.label) ??
    issues.find((item) => item.severity === 'critical') ??
    issues.find((item) => item.severity === 'warning');

  return {
    nodeId: bottleneck.nodeId,
    label: bottleneck.label,
    reason: topIssue?.reason ?? bottleneck.reason,
    capacityPerHour: bottleneck.capacity,
    lineBalanceRate,
    recommendations: topIssue?.suggestions ?? bottleneck.recommendations,
    issues: issues.filter((item) => item.severity !== 'info').concat(issues.filter((item) => item.severity === 'info')),
  };
};

export const buildSimulationSummary = (
  nodes: FactoryNode[],
  edges: FactoryEdge[],
  elapsedSec: number,
): SimulationSummary => {
  const activeNodes = nodes.filter((node) => node.data.params.enabled);
  const bottleneck = analyzeBottleneck(nodes, edges);
  const sinkNodes = activeNodes.filter((node) => !edges.some((edge) => edge.source === node.id));
  const totalSinkOutput = sinkNodes.reduce((sum, node) => sum + node.data.metrics.totalOutput, 0);
  const simulationCapacityPerHour =
    elapsedSec > 0 ? (totalSinkOutput / elapsedSec) * 3600 : 0;

  const statusCounts = statuses.reduce(
    (acc, status) => {
      acc[status] = activeNodes.filter((node) => node.data.runtime.status === status).length;
      return acc;
    },
    {} as Record<DeviceStatus, number>,
  );

  return {
    elapsedSec,
    theoreticalCapacityPerHour: bottleneck.capacityPerHour,
    simulationCapacityPerHour,
    bottleneck,
    statusCounts,
    stageAnalysis: analyzeStages(activeNodes),
  };
};
