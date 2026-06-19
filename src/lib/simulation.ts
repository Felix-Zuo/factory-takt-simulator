import { nanoid } from './uid';
import { getSimulationBatchSize, getSimulationCycleTime } from './takt';
import { getPortRule } from './portRules';
import { loaderArmGroupId, tickLoaderArmGroup } from './simulationLoaderArm';
import { tickFinishingNode } from './simulationFinishing';
import {
  canReceiveInput,
  clamp,
  cloneSimulationEdges,
  cloneSimulationNodes,
  edgeMovingQuantity,
  flushLineBufferToTarget,
  addInputToHandle,
  inputSpaceForHandle,
  isSplitStorageFeeder,
  lineBufferFree,
  outputBufferCountForHandle,
  outputSpace,
  takeOutputFromHandle,
  updateDerivedMetrics,
} from './simulationPrimitives';
import type { FactoryEdge, FactoryNode, FlowEdgeData } from '../types/factory';

// The simulation engine is intentionally deterministic: each tick receives the
// previous graph state and returns cloned nodes/edges with updated buffers,
// timers, in-flight packets, and accumulated statistics.
const maintenanceDue = (node: FactoryNode) => {
  const { params, runtime } = node.data;
  if (params.taktMode === 'manual') return null;
  if (
    params.dressingIntervalUnits > 0 &&
    runtime.processedSinceDressing >= params.dressingIntervalUnits
  ) {
    return { kind: 'dressing' as const, duration: params.dressingDurationSec };
  }
  if (
    params.consumableIntervalUnits > 0 &&
    runtime.processedSinceConsumable >= params.consumableIntervalUnits
  ) {
    return { kind: 'changing_consumable' as const, duration: params.consumableChangeSec };
  }
  return null;
};

const releasePendingOutput = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;
  if (runtime.pendingOutput <= 0) return false;

  if (outputSpace(node) >= runtime.pendingOutput) {
    params.outputBufferCount += runtime.pendingOutput;
    metrics.totalOutput += runtime.pendingOutput;
    runtime.pendingOutput = 0;
    runtime.status = 'idle';
    return false;
  }

  runtime.status = 'blocked';
  metrics.totalBlockedTime += dt;
  updateDerivedMetrics(node, elapsedSec);
  return true;
};

const finishProcessing = (node: FactoryNode) => {
  const { params, runtime, metrics } = node.data;
  const processed = getSimulationBatchSize(params);
  const effectiveQuality = params.taktMode === 'manual' ? 1 : clamp(params.yieldRate * (1 - params.ngRate), 0, 1);
  const qualifiedWork = processed * effectiveQuality + runtime.qualityCarry;
  const output = Math.floor(qualifiedWork);
  runtime.qualityCarry = qualifiedWork - output;
  if (params.taktMode !== 'manual') {
    runtime.processedSinceDressing += processed;
    runtime.processedSinceConsumable += processed;
  }

  if (output <= 0) {
    runtime.status = 'idle';
    return;
  }

  if (outputSpace(node) >= output) {
    params.outputBufferCount += output;
    metrics.totalOutput += output;
  } else {
    runtime.pendingOutput = output;
    runtime.status = 'blocked';
  }
};

const tickStorageFeeder = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;
  const batch = Math.max(1, params.feedBatchSize);
  const feedInterval = params.taktMode === 'manual' ? Math.max(0.2, params.manualTaktSec * batch) : params.feedIntervalSec;

  if (isSplitStorageFeeder(node)) {
    const bigSpace = Math.max(0, params.partAStorageCapacity - params.partAStorageCount);
    const smallSpace = Math.max(0, params.partBStorageCapacity - params.partBStorageCount);
    const syncCounts = () => {
      params.outputBufferCount = params.partAStorageCount + params.partBStorageCount;
      params.currentStorageCount = Math.max(0, params.currentStorageCount);
      params.inputBufferCount = Math.min(params.inputBufferCapacity, params.currentStorageCount);
    };

    if (runtime.processRemainingSec > 0) {
      runtime.processRemainingSec = Math.max(0, runtime.processRemainingSec - dt);
      runtime.status = 'running';
      metrics.totalProcessingTime += dt;
      if (runtime.processRemainingSec === 0) {
        let moved = 0;
        if (params.currentStorageCount >= batch && bigSpace >= batch) {
          params.partAStorageCount += batch;
          params.currentStorageCount -= batch;
          moved += batch;
        }
        if (params.currentStorageCount >= batch && smallSpace >= batch) {
          params.partBStorageCount += batch;
          params.currentStorageCount -= batch;
          moved += batch;
        }
        metrics.totalOutput += moved;
        syncCounts();
      }
      updateDerivedMetrics(node, elapsedSec);
      return;
    }

    if (params.currentStorageCount < batch) {
      runtime.status = 'waiting_material';
      metrics.totalWaitingTime += dt;
      syncCounts();
      updateDerivedMetrics(node, elapsedSec);
      return;
    }

    if (bigSpace < batch && smallSpace < batch) {
      runtime.status = 'blocked';
      metrics.totalBlockedTime += dt;
      syncCounts();
      updateDerivedMetrics(node, elapsedSec);
      return;
    }

    metrics.totalInput += Math.min(params.currentStorageCount, (bigSpace >= batch ? batch : 0) + (smallSpace >= batch ? batch : 0));
    runtime.processRemainingSec = Math.max(0.2, feedInterval);
    runtime.status = 'running';
    syncCounts();
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (releasePendingOutput(node, dt, elapsedSec)) return;

  if (runtime.processRemainingSec > 0) {
    runtime.processRemainingSec = Math.max(0, runtime.processRemainingSec - dt);
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;
    if (runtime.processRemainingSec === 0) {
      if (outputSpace(node) >= batch) {
        params.outputBufferCount += batch;
        metrics.totalOutput += batch;
      } else {
        runtime.pendingOutput = batch;
        runtime.status = 'blocked';
      }
    }
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.currentStorageCount < batch) {
    runtime.status = 'waiting_material';
    metrics.totalWaitingTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (outputSpace(node) < batch) {
    runtime.status = 'blocked';
    metrics.totalBlockedTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  params.currentStorageCount -= batch;
  params.inputBufferCount = Math.min(params.inputBufferCapacity, params.currentStorageCount);
  metrics.totalInput += batch;
  runtime.processRemainingSec = Math.max(0.2, feedInterval);
  runtime.status = 'running';
  updateDerivedMetrics(node, elapsedSec);
};

const tickMaterialSource = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;
  const batch = Math.max(1, params.feedBatchSize);
  const interval = Math.max(0.1, params.taktMode === 'manual' ? params.manualTaktSec * batch : params.feedIntervalSec);

  if (outputSpace(node) < batch) {
    runtime.status = 'blocked';
    metrics.totalBlockedTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  runtime.processRemainingSec = Math.max(0, runtime.processRemainingSec - dt);
  if (runtime.processRemainingSec <= 0) {
    params.outputBufferCount += batch;
    metrics.totalOutput += batch;
    runtime.processRemainingSec = interval;
  }

  runtime.status = 'running';
  metrics.totalProcessingTime += dt;
  updateDerivedMetrics(node, elapsedSec);
};

const tickFinishedSink = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;
  const received = Math.max(0, params.inputBufferCount);

  if (received > 0) {
    params.inputBufferCount = 0;
    metrics.totalInput += received;
    metrics.totalOutput += received;
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;
  } else {
    runtime.status = 'waiting_material';
    metrics.totalWaitingTime += dt;
  }

  updateDerivedMetrics(node, elapsedSec);
};

const syncAssemblyStorageTotals = (node: FactoryNode) => {
  const { params } = node.data;
  params.currentStorageCount = params.partAStorageCount + params.partBStorageCount;
  params.inputBufferCount = params.currentStorageCount;
  params.outputBufferCount = params.currentStorageCount;
};

const tickAssemblyStorage = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { runtime, metrics } = node.data;
  syncAssemblyStorageTotals(node);
  if (node.data.params.currentStorageCount > 0) {
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;
  } else {
    runtime.status = 'waiting_material';
    metrics.totalWaitingTime += dt;
  }
  updateDerivedMetrics(node, elapsedSec);
};

const tickPairingStation = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;

  if (releasePendingOutput(node, dt, elapsedSec)) return;

  if (runtime.processRemainingSec > 0) {
    runtime.processRemainingSec = Math.max(0, runtime.processRemainingSec - dt);
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;
    if (runtime.processRemainingSec === 0) {
      if (outputSpace(node) >= 1) {
        params.outputBufferCount += 1;
        metrics.totalOutput += 1;
      } else {
        runtime.pendingOutput = 1;
        runtime.status = 'blocked';
      }
    }
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (outputSpace(node) < 1) {
    runtime.status = 'blocked';
    metrics.totalBlockedTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.station1InputBufferCount < 1 || params.station2InputBufferCount < 1) {
    params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
    runtime.status = 'waiting_material';
    metrics.totalWaitingTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  params.station1InputBufferCount -= 1;
  params.station2InputBufferCount -= 1;
  params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
  metrics.totalInput += 2;
  runtime.processRemainingSec = Math.max(0.2, getSimulationCycleTime(params));
  runtime.status = 'running';
  updateDerivedMetrics(node, elapsedSec);
};

const tickAssemblyCleaner = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;
  const laneCapacity = Math.max(1, params.cleanerLaneCapacity * Math.max(1, params.cleanerLaneCount));
  const airBatch = Math.max(1, params.cleanerAirBatchSize);
  const airTime = Math.max(0.1, params.cleanerAirTimeSec);
  const pushInterval = Math.max(0.1, params.cleanerPushIntervalSec);

  if (runtime.cleanerOutputQueue > 0) {
    const released = Math.min(runtime.cleanerOutputQueue, outputSpace(node));
    if (released > 0) {
      params.outputBufferCount += released;
      metrics.totalOutput += released;
      runtime.cleanerOutputQueue -= released;
      runtime.status = 'running';
    }
    if (runtime.cleanerOutputQueue > 0) {
      runtime.status = 'blocked';
      metrics.totalBlockedTime += dt;
      updateDerivedMetrics(node, elapsedSec);
      return;
    }
  }

  if (runtime.cleanerAirRemainingSec > 0) {
    runtime.cleanerAirRemainingSec = Math.max(0, runtime.cleanerAirRemainingSec - dt);
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;
    if (runtime.cleanerAirRemainingSec === 0) {
      const dried = Math.min(airBatch, params.cleanerReadyCount);
      params.cleanerReadyCount -= dried;
      runtime.cleanerOutputQueue += dried;
    }
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.cleanerReadyCount >= airBatch) {
    runtime.cleanerAirRemainingSec = airTime;
    runtime.status = 'running';
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  runtime.cleanerPushRemainingSec = Math.max(0, runtime.cleanerPushRemainingSec - dt);
  if (runtime.cleanerPushRemainingSec > 0) {
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.inputBufferCount < 1) {
    runtime.status = 'waiting_material';
    metrics.totalWaitingTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  const canLoadOpenSlot = params.cleanerInternalCount < laneCapacity;
  const canPushOutlet = params.cleanerInternalCount >= laneCapacity && params.cleanerReadyCount < airBatch;
  if (!canLoadOpenSlot && !canPushOutlet) {
    runtime.status = 'blocked';
    metrics.totalBlockedTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  params.inputBufferCount -= 1;
  metrics.totalInput += 1;
  if (canLoadOpenSlot) params.cleanerInternalCount += 1;
  else params.cleanerReadyCount += 1;
  runtime.cleanerPushRemainingSec = pushInterval;
  runtime.status = 'running';
  updateDerivedMetrics(node, elapsedSec);
};

const tickSpinDryer = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;
  const columnBatch = Math.max(1, params.dryerColumnBatchSize ?? 5);
  const columnCount = Math.max(1, params.dryerColumnCount ?? 5);
  const dryTime = Math.max(0.2, params.dryerDryTimeSec ?? params.processTimeSec);

  params.dryerLoadedColumns = Math.max(0, params.dryerLoadedColumns ?? 0);
  params.dryerDriedColumns = Math.max(0, params.dryerDriedColumns ?? 0);

  if (runtime.processRemainingSec > 0) {
    runtime.processRemainingSec = Math.max(0, runtime.processRemainingSec - dt);
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;

    if (runtime.processRemainingSec === 0) {
      params.dryerDriedColumns += params.dryerLoadedColumns;
      params.dryerLoadedColumns = 0;
      runtime.status = params.dryerDriedColumns > 0 ? 'idle' : 'waiting_material';
    }

    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.dryerLoadedColumns >= columnCount && params.dryerDriedColumns === 0) {
    runtime.processRemainingSec = dryTime;
    runtime.status = 'running';
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.inputBufferCount < columnBatch) {
    runtime.status = 'waiting_material';
    metrics.totalWaitingTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.dryerDriedColumns > 0 && outputSpace(node) < columnBatch) {
    runtime.status = 'blocked';
    metrics.totalBlockedTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.dryerDriedColumns === 0 && params.dryerLoadedColumns >= columnCount) {
    runtime.status = 'blocked';
    metrics.totalBlockedTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.dryerDriedColumns > 0) {
    params.dryerDriedColumns -= 1;
    params.outputBufferCount += columnBatch;
    metrics.totalOutput += columnBatch;
  }

  params.inputBufferCount -= columnBatch;
  params.dryerLoadedColumns += 1;
  metrics.totalInput += columnBatch;
  runtime.status = 'running';

  if (params.dryerLoadedColumns >= columnCount && params.dryerDriedColumns === 0) {
    runtime.processRemainingSec = dryTime;
  }

  updateDerivedMetrics(node, elapsedSec);
};

const tickProcessNode = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;

  if (!params.enabled) {
    runtime.status = 'stopped';
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (params.deviceType === 'storage_feeder') {
    tickStorageFeeder(node, dt, elapsedSec);
    return;
  }

  if (params.deviceType === 'material_source') {
    tickMaterialSource(node, dt, elapsedSec);
    return;
  }

  if (params.deviceType === 'finished_sink') {
    tickFinishedSink(node, dt, elapsedSec);
    return;
  }

  if (params.deviceType === 'packing_sink') {
    tickFinishedSink(node, dt, elapsedSec);
    return;
  }

  if (params.deviceType === 'merge_buffer') {
    tickAssemblyStorage(node, dt, elapsedSec);
    return;
  }

  if (params.deviceType === 'join_station') {
    tickPairingStation(node, dt, elapsedSec);
    return;
  }

  if (params.deviceType === 'wash_dry') {
    tickAssemblyCleaner(node, dt, elapsedSec);
    return;
  }

  if (params.deviceType === 'spin_dryer') {
    tickSpinDryer(node, dt, elapsedSec);
    return;
  }

  if (tickFinishingNode(node, dt, elapsedSec)) return;

  if (params.taktMode === 'manual' && runtime.maintenanceRemainingSec > 0) {
    runtime.maintenanceRemainingSec = 0;
    runtime.maintenanceKind = null;
  }

  if (runtime.maintenanceRemainingSec > 0) {
    runtime.maintenanceRemainingSec = Math.max(0, runtime.maintenanceRemainingSec - dt);
    runtime.status = runtime.maintenanceKind === 'dressing' ? 'dressing' : 'changing_consumable';
    if (runtime.status === 'dressing') metrics.totalDressingTime += dt;
    if (runtime.status === 'changing_consumable') metrics.totalConsumableTime += dt;
    if (runtime.maintenanceRemainingSec === 0) {
      if (runtime.maintenanceKind === 'dressing') runtime.processedSinceDressing = 0;
      if (runtime.maintenanceKind === 'changing_consumable') runtime.processedSinceConsumable = 0;
      runtime.maintenanceKind = null;
    }
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  if (releasePendingOutput(node, dt, elapsedSec)) return;

  if (runtime.processRemainingSec > 0) {
    runtime.processRemainingSec = Math.max(0, runtime.processRemainingSec - dt);
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;
    if (runtime.processRemainingSec === 0) finishProcessing(node);
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  const due = maintenanceDue(node);
  if (due && due.duration > 0) {
    runtime.maintenanceKind = due.kind;
    runtime.maintenanceRemainingSec = due.duration;
    runtime.status = due.kind;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  const batch = getSimulationBatchSize(params);
  if (params.inputBufferCount < batch) {
    runtime.status = 'waiting_material';
    metrics.totalWaitingTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }

  params.inputBufferCount -= batch;
  metrics.totalInput += batch;
  runtime.processRemainingSec = Math.max(0.2, getSimulationCycleTime(params));
  runtime.status = 'running';
  updateDerivedMetrics(node, elapsedSec);
};

const completePackets = (nodes: FactoryNode[], edges: FactoryEdge[], dt: number) => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  edges.forEach((edge) => {
    const target = nodeMap.get(edge.target);
    if (!target || !edge.data) return;

    flushLineBufferToTarget(edge.data, target, edge.targetHandle);

    const leadPacket = edge.data.inTransit[0];
    const targetCanDrain =
      !leadPacket ||
      canReceiveInput(target, leadPacket.quantity, edge.targetHandle) ||
      (edge.data.allowBuffer && lineBufferFree(edge.data) >= leadPacket.quantity);
    if (!targetCanDrain && edge.data.inTransit.length > 0) {
      edge.data.warning = `LINE_STOPPED: ${target.data.params.deviceShortName} input and line buffer are full.`;
      edge.data.inTransit = edge.data.inTransit.map((packet) => ({ ...packet }));
      return;
    }
    if (edge.data.warning?.startsWith('LINE_STOPPED')) edge.data.warning = undefined;

    const remainingPackets: FlowEdgeData['inTransit'] = [];
    for (const packet of edge.data.inTransit) {
      const nextPacket = { ...packet, remainingSec: Math.max(0, packet.remainingSec - dt) };
      if (nextPacket.remainingSec <= 0 && canReceiveInput(target, nextPacket.quantity, edge.targetHandle)) {
        addInputToHandle(target, nextPacket.quantity, edge.targetHandle);
      } else if (
        nextPacket.remainingSec <= 0 &&
        edge.data.allowBuffer &&
        lineBufferFree(edge.data) >= nextPacket.quantity
      ) {
        edge.data.lineBufferCount += nextPacket.quantity;
      } else {
        remainingPackets.push(nextPacket);
      }
    }
    edge.data.inTransit = remainingPackets;
    flushLineBufferToTarget(edge.data, target, edge.targetHandle);
  });
};

const tickConveyorEdge = (
  edgeData: FlowEdgeData,
  source: FactoryNode,
  target: FactoryNode,
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
  dt: number,
  elapsedSec: number,
) => {
  const sourceRule = getPortRule(source.data.params, 'output', sourceHandle ?? 'out-1');
  const targetRule = getPortRule(target.data.params, 'input', targetHandle ?? 'in-1');
  if (!sourceRule.enabled || !targetRule.enabled) {
    edgeData.warning = 'Port gate disabled.';
    return;
  }
  const batch = Math.max(
    sourceRule.minBatch,
    targetRule.minBatch,
    Math.min(Math.max(1, edgeData.batchSize), sourceRule.maxBatch, targetRule.maxBatch),
  );
  const sourceReady = outputBufferCountForHandle(source, sourceHandle) >= batch;
  const targetReady = inputSpaceForHandle(target, targetHandle) >= batch;
  const lineBufferReady = edgeData.allowBuffer && lineBufferFree(edgeData) >= batch;
  const capacityReady = edgeData.inTransit.length < edgeData.capacity;
  const dispatchInterval = Math.max(0, edgeData.dispatchIntervalSec ?? 0);

  edgeData.lineBufferCount = edgeData.lineBufferCount ?? 0;
  edgeData.lineBufferCapacity = edgeData.lineBufferCapacity ?? 0;

  if (edgeData.warning?.startsWith('LINE_STOPPED')) {
    if (sourceReady && source.data.runtime.status !== 'running') {
      source.data.runtime.status = 'blocked';
      source.data.metrics.totalBlockedTime += dt;
      updateDerivedMetrics(source, elapsedSec);
    }
    return;
  }

  edgeData.warning = undefined;

  if (dispatchInterval > 0 && edgeData.phaseRemainingSec > 0) {
    edgeData.phaseRemainingSec = Math.max(0, edgeData.phaseRemainingSec - dt);
    return;
  }

  if (!sourceReady) {
    edgeData.warning = `${source.data.params.deviceShortName} output is below transfer batch.`;
    return;
  }
  if (!targetReady && !lineBufferReady) {
    edgeData.warning = `${target.data.params.deviceShortName} input is full and line buffer is full.`;
    if (source.data.runtime.status !== 'running') {
      source.data.runtime.status = 'blocked';
      source.data.metrics.totalBlockedTime += dt;
      updateDerivedMetrics(source, elapsedSec);
    }
    return;
  }
  if (!capacityReady) {
    edgeData.warning = `${edgeData.label} in-transit capacity is full.`;
    if (source.data.runtime.status !== 'running') {
      source.data.runtime.status = 'blocked';
      source.data.metrics.totalBlockedTime += dt;
      updateDerivedMetrics(source, elapsedSec);
    }
    return;
  }

  takeOutputFromHandle(source, batch, sourceHandle);
  if (dispatchInterval > 0) edgeData.phaseRemainingSec = dispatchInterval;
  edgeData.inTransit.push({
    id: nanoid(),
    quantity: batch,
    remainingSec: Math.max(0.2, edgeData.travelTimeSec),
    totalSec: Math.max(0.2, edgeData.travelTimeSec),
  });
};

const tickEdges = (nodes: FactoryNode[], edges: FactoryEdge[], dt: number, elapsedSec: number) => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  completePackets(nodes, edges, dt);

  const loaderGroups = new Map<string, FactoryEdge[]>();
  const directEdges: FactoryEdge[] = [];

  edges.forEach((edge) => {
    if (!edge.data) return;
    if (edge.data.transportType === 'loader_arm') {
      const groupId = loaderArmGroupId(edge);
      loaderGroups.set(groupId, [...(loaderGroups.get(groupId) ?? []), edge]);
    } else {
      directEdges.push(edge);
    }
  });

  directEdges.forEach((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target || !edge.data) return;
    tickConveyorEdge(edge.data, source, target, edge.sourceHandle, edge.targetHandle, dt, elapsedSec);
  });

  loaderGroups.forEach((groupEdges) => tickLoaderArmGroup(groupEdges, nodeMap, dt, elapsedSec));

  edges.forEach((edge) => {
    if (!edge.data) return;
    const motionLoad =
      edge.data.transportType === 'loader_arm'
        ? edge.data.armPhase === 'home'
          ? 0
          : 1
        : edge.data.capacity > 0
          ? (edgeMovingQuantity(edge.data) / Math.max(1, edge.data.batchSize) +
              edge.data.lineBufferCount / Math.max(1, edge.data.batchSize)) /
            Math.max(1, edge.data.capacity)
          : 0;
    edge.data.utilization = clamp(motionLoad, 0, 1);
  });
};

const applyArmStatuses = (nodes: FactoryNode[], edges: FactoryEdge[]) => {
  const outgoingBySource = new Map<string, FactoryEdge[]>();
  edges.forEach((edge) => {
    if (!outgoingBySource.has(edge.source)) outgoingBySource.set(edge.source, []);
    outgoingBySource.get(edge.source)?.push(edge);
  });

  nodes.forEach((node) => {
    if (node.data.params.deviceType !== 'robot') return;
    const loaderEdges = (outgoingBySource.get(node.id) ?? []).filter(
      (edge) => edge.data?.transportType === 'loader_arm',
    );
    const activeEdge = loaderEdges.find((edge) => edge.data && edge.data.armPhase !== 'home');
    const waitSpace = loaderEdges.find((edge) => edge.data?.warning?.startsWith('ARM_WAIT_SPACE'));
    const waitPick = loaderEdges.find((edge) => edge.data?.warning?.startsWith('ARM_WAIT_PICK'));

    if (activeEdge) node.data.runtime.status = 'transporting';
    else if (waitSpace) node.data.runtime.status = 'arm_wait_space';
    else if (waitPick) node.data.runtime.status = 'arm_wait_pick';
    else node.data.runtime.status = 'idle';
  });
};

const applyTransferPressure = (
  nodes: FactoryNode[],
  edges: FactoryEdge[],
  dt: number,
  elapsedSec: number,
) => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  edges.forEach((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target || !edge.data || edge.data.transportType === 'loader_arm') return;

    const batch = Math.max(1, edge.data.batchSize);
    if (outputBufferCountForHandle(source, edge.sourceHandle) < batch) return;

    const canMoveNow =
      edge.data.inTransit.length < edge.data.capacity &&
      (inputSpaceForHandle(target, edge.targetHandle) >= batch || (edge.data.allowBuffer && lineBufferFree(edge.data) >= batch));

    if (!canMoveNow && source.data.runtime.status !== 'running') {
      source.data.runtime.status = 'blocked';
      source.data.metrics.totalBlockedTime += dt;
      updateDerivedMetrics(source, elapsedSec);
    }
  });
};

export const tickSimulation = (
  nodes: FactoryNode[],
  edges: FactoryEdge[],
  dt: number,
  elapsedSec: number,
) => {
  const nextNodes = cloneSimulationNodes(nodes);
  const nextEdges = cloneSimulationEdges(edges);

  tickEdges(nextNodes, nextEdges, dt, elapsedSec);
  nextNodes.forEach((node) => tickProcessNode(node, dt, elapsedSec));
  applyTransferPressure(nextNodes, nextEdges, dt, elapsedSec);
  applyArmStatuses(nextNodes, nextEdges);

  return {
    nodes: nextNodes,
    edges: nextEdges,
  };
};
