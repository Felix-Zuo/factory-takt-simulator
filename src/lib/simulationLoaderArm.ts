import { getPortRule } from './portRules';
import {
  addInputToHandle,
  inputBufferCountForHandle,
  inputSpaceForHandle,
  rotateAfter,
  updateDerivedMetrics,
} from './simulationPrimitives';
import type { FactoryEdge, FactoryNode, FlowEdgeData } from '../types/factory';

type ArmCandidate = {
  edge: FactoryEdge;
  source: FactoryNode;
  target: FactoryNode;
  data: FlowEdgeData;
  sourceRule: ReturnType<typeof getPortRule>;
  targetRule: ReturnType<typeof getPortRule>;
  batch: number;
  sourceReady: boolean;
  targetReady: boolean;
  sourceLoad: number;
  targetLoad: number;
};

export const loaderArmGroupId = (edge: FactoryEdge) => edge.data?.armGroupId?.trim() || edge.id;

const tickLoaderArmEdge = (
  edgeData: FlowEdgeData,
  source: FactoryNode,
  target: FactoryNode,
  targetHandle: string | null | undefined,
  dt: number,
  batchOverride?: number,
) => {
  const batch = Math.max(1, batchOverride ?? edgeData.pickCount);
  const phaseDuration = (value: number) => Math.max(0.05, value);
  edgeData.warning = undefined;

  if (edgeData.phaseRemainingSec > 0) {
    edgeData.phaseRemainingSec = Math.max(0, edgeData.phaseRemainingSec - dt);
    if (edgeData.phaseRemainingSec > 0) return;

    if (edgeData.armPhase === 'picking') {
      const picked = Math.min(source.data.params.outputBufferCount, edgeData.carriedQuantity);
      source.data.params.outputBufferCount -= picked;
      edgeData.carriedQuantity = picked;
      edgeData.armPhase = 'moving';
      edgeData.phaseRemainingSec = phaseDuration(edgeData.moveTimeSec);
      return;
    }

    if (edgeData.armPhase === 'moving') {
      edgeData.armPhase = 'placing';
      edgeData.phaseRemainingSec = phaseDuration(edgeData.placeTimeSec);
      return;
    }

    if (edgeData.armPhase === 'placing') {
      if (inputSpaceForHandle(target, targetHandle) >= edgeData.carriedQuantity) {
        addInputToHandle(target, edgeData.carriedQuantity, targetHandle);
        edgeData.armPhase = 'returning';
        edgeData.phaseRemainingSec = phaseDuration(edgeData.returnTimeSec);
      } else {
        edgeData.armPhase = 'placing';
        edgeData.phaseRemainingSec = 0.5;
        edgeData.warning = `${target.data.params.deviceShortName} input filled during arm travel.`;
      }
      return;
    }

    if (edgeData.armPhase === 'returning') {
      edgeData.carriedQuantity = 0;
      edgeData.armPhase = 'home';
      edgeData.phaseRemainingSec = 0;
    }
    return;
  }

  if (edgeData.armPhase !== 'home') return;
  if (source.data.params.outputBufferCount < batch) {
    edgeData.waitPickTime += dt;
    edgeData.warning = 'ARM_WAIT_PICK: upstream output is below trigger batch.';
    return;
  }
  if (inputSpaceForHandle(target, targetHandle) < batch) {
    edgeData.waitSpaceTime += dt;
    edgeData.warning = 'ARM_WAIT_SPACE: downstream input buffer has insufficient free space.';
    source.data.runtime.status = 'blocked';
    return;
  }

  edgeData.carriedQuantity = batch;
  edgeData.armPhase = 'picking';
  edgeData.phaseRemainingSec = phaseDuration(edgeData.pickTimeSec);
};

const buildCandidate = (edge: FactoryEdge, nodeMap: Map<string, FactoryNode>): ArmCandidate | null => {
  const source = nodeMap.get(edge.source);
  const target = nodeMap.get(edge.target);
  const data = edge.data;
  if (!source || !target || !data) return null;

  const sourceRule = getPortRule(source.data.params, 'output', edge.sourceHandle ?? 'out-1');
  const targetRule = getPortRule(target.data.params, 'input', edge.targetHandle ?? 'in-1');
  if (!sourceRule.enabled || !targetRule.enabled) return null;
  const requestedBatch = Math.max(1, data.pickCount);
  const batch = Math.max(
    sourceRule.minBatch,
    targetRule.minBatch,
    Math.min(requestedBatch, sourceRule.maxBatch, targetRule.maxBatch),
  );
  const trigger = Math.max(batch, data.triggerBatch, sourceRule.minBatch);

  return {
    edge,
    source,
    target,
    data,
    sourceRule,
    targetRule,
    batch,
    sourceReady: source.data.params.outputBufferCount >= trigger,
    targetReady: inputSpaceForHandle(target, edge.targetHandle) >= batch,
    sourceLoad: source.data.params.outputBufferCount,
    targetLoad: inputBufferCountForHandle(target, edge.targetHandle),
  };
};

const chooseArmCandidate = (candidates: ArmCandidate[], referenceData?: FlowEdgeData) => {
  const sourceIds = [...new Map(candidates.map((candidate) => [candidate.source.id, candidate.source.id])).values()];
  const orderedSources = rotateAfter(sourceIds, referenceData?.lastPickupSourceId ?? '');

  sourceLoop: for (const sourceId of orderedSources) {
    const allSourceCandidates = candidates.filter((candidate) => candidate.source.id === sourceId);
    const sourceCandidates = allSourceCandidates.filter((candidate) => candidate.sourceReady);
    if (sourceCandidates.length === 0) {
      const sourceRule = allSourceCandidates[0]?.sourceRule;
      if (sourceRule?.routingStrategy === 'force_round_robin' || sourceRule?.blockedBehavior === 'wait_blocked') break;
      continue;
    }

    const targetIds = [...new Map(sourceCandidates.map((candidate) => [candidate.target.id, candidate.target.id])).values()];
    const orderedTargets = rotateAfter(targetIds, referenceData?.lastDropTargetId ?? '');
    const useLowestWip = sourceCandidates.some((candidate) => candidate.targetRule.routingStrategy === 'lowest_inventory_first');
    const targetCandidate = useLowestWip
      ? [...sourceCandidates]
          .filter((candidate) => candidate.targetReady)
          .sort((a, b) => a.targetLoad - b.targetLoad || a.targetRule.priority - b.targetRule.priority)[0]
      : orderedTargets
          .map((targetId) => sourceCandidates.find((candidate) => candidate.target.id === targetId))
          .find((candidate) => {
            if (candidate?.targetReady) return true;
            return (
              candidate?.targetRule.blockedBehavior === 'wait_blocked' ||
              candidate?.targetRule.routingStrategy === 'force_round_robin'
            );
          });

    if (targetCandidate?.targetReady) return targetCandidate;
    if (targetCandidate) break sourceLoop;
  }
  return undefined;
};

export const tickLoaderArmGroup = (
  groupEdges: FactoryEdge[],
  nodeMap: Map<string, FactoryNode>,
  dt: number,
  elapsedSec: number,
) => {
  groupEdges.forEach((edge) => {
    if (edge.data) edge.data.warning = undefined;
  });

  const activeEdge = groupEdges.find(
    (edge) =>
      edge.data &&
      (edge.data.armPhase !== 'home' || edge.data.phaseRemainingSec > 0 || edge.data.carriedQuantity > 0),
  );
  if (activeEdge?.data) {
    const source = nodeMap.get(activeEdge.source);
    const target = nodeMap.get(activeEdge.target);
    if (source && target) tickLoaderArmEdge(activeEdge.data, source, target, activeEdge.targetHandle, dt);
    return;
  }

  const candidates = groupEdges.map((edge) => buildCandidate(edge, nodeMap)).filter(Boolean) as ArmCandidate[];
  const referenceData = groupEdges.find((edge) => edge.data)?.data;
  const chosen = chooseArmCandidate(candidates, referenceData);
  if (chosen) {
    groupEdges.forEach((edge) => {
      if (!edge.data) return;
      edge.data.lastPickupSourceId = chosen.source.id;
      edge.data.lastDropTargetId = chosen.target.id;
    });
    tickLoaderArmEdge(chosen.data, chosen.source, chosen.target, chosen.edge.targetHandle, dt, chosen.batch);
    return;
  }

  const hasReadySource = candidates.some((candidate) => candidate.sourceReady);
  candidates.forEach((candidate) => {
    if (!candidate.sourceReady) {
      candidate.data.waitPickTime += dt;
      candidate.data.warning = 'ARM_WAIT_PICK: upstream output is below trigger batch.';
      return;
    }

    candidate.data.waitSpaceTime += dt;
    candidate.data.warning = 'ARM_WAIT_SPACE: downstream input buffer has insufficient free space.';
    if (candidate.source.data.runtime.status !== 'running') {
      candidate.source.data.runtime.status = 'blocked';
      candidate.source.data.metrics.totalBlockedTime += dt;
      updateDerivedMetrics(candidate.source, elapsedSec);
    }
  });

  if (!hasReadySource) {
    groupEdges.forEach((edge) => {
      if (!edge.data) return;
      edge.data.warning = edge.data.warning ?? 'ARM_WAIT_PICK: no source in this arm group has reached trigger batch.';
    });
  }
};

