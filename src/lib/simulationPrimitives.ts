import { calculateDeviceMetrics } from './takt';
import type { FactoryEdge, FactoryNode, FlowEdgeData } from '../types/factory';

// Shared buffer and port helpers live here so specialized simulators can reuse
// the same capacity rules instead of duplicating near-identical logic.
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const inputSpace = (node: FactoryNode) =>
  Math.max(0, node.data.params.inputBufferCapacity - node.data.params.inputBufferCount);

export const isParallelSuperfinish = (node: FactoryNode) =>
  node.data.params.processFamily === 'superfinishing' && node.data.params.superfinishingMode === 'parallel_once';

export const isSerialSuperfinish = (node: FactoryNode) =>
  node.data.params.processFamily === 'superfinishing' && node.data.params.superfinishingMode === 'serial_twice';

export const isAssemblyStorage = (node: FactoryNode) => node.data.params.deviceType === 'assembly_storage';

export const isSplitStorageFeeder = (node: FactoryNode) =>
  node.data.params.deviceType === 'storage_feeder' && (node.data.params.outputPortCount ?? 1) >= 2;

export const isPairingStation = (node: FactoryNode) => node.data.params.deviceType === 'pairing_station';

export const inputBufferCountForHandle = (node: FactoryNode, handleId?: string | null) => {
  const { params } = node.data;
  if (isAssemblyStorage(node)) {
    return handleId === 'in-2' ? params.assemblySmallStorageCount : params.assemblyBigStorageCount;
  }
  if (isPairingStation(node)) {
    return handleId === 'in-2' ? params.station2InputBufferCount : params.station1InputBufferCount;
  }
  if (isParallelSuperfinish(node)) {
    return handleId === 'in-2' ? params.station2InputBufferCount : params.station1InputBufferCount;
  }
  if (isSerialSuperfinish(node)) return params.station1InputBufferCount;
  return params.inputBufferCount;
};

export const inputSpaceForHandle = (node: FactoryNode, handleId?: string | null) => {
  const { params } = node.data;
  if (isAssemblyStorage(node)) {
    return handleId === 'in-2'
      ? Math.max(0, params.assemblySmallStorageCapacity - params.assemblySmallStorageCount)
      : Math.max(0, params.assemblyBigStorageCapacity - params.assemblyBigStorageCount);
  }
  if (isPairingStation(node)) {
    return handleId === 'in-2'
      ? Math.max(0, params.station2InputBufferCapacity - params.station2InputBufferCount)
      : Math.max(0, params.station1InputBufferCapacity - params.station1InputBufferCount);
  }
  if (isParallelSuperfinish(node)) {
    return handleId === 'in-2'
      ? Math.max(0, params.station2InputBufferCapacity - params.station2InputBufferCount)
      : Math.max(0, params.station1InputBufferCapacity - params.station1InputBufferCount);
  }
  if (isSerialSuperfinish(node)) {
    return handleId === 'in-1'
      ? Math.max(0, params.station1InputBufferCapacity - params.station1InputBufferCount)
      : 0;
  }
  if (params.deviceType === 'storage_feeder') {
    return Math.max(0, params.storageCapacity - params.currentStorageCount);
  }
  return inputSpace(node);
};

export const addInputToHandle = (node: FactoryNode, amount: number, handleId?: string | null) => {
  const { params } = node.data;
  if (isAssemblyStorage(node)) {
    if (handleId === 'in-2') params.assemblySmallStorageCount += amount;
    else params.assemblyBigStorageCount += amount;
    params.currentStorageCount = params.assemblyBigStorageCount + params.assemblySmallStorageCount;
    params.inputBufferCount = params.currentStorageCount;
    params.outputBufferCount = params.currentStorageCount;
    return;
  }
  if (isPairingStation(node)) {
    if (handleId === 'in-2') params.station2InputBufferCount += amount;
    else params.station1InputBufferCount += amount;
    params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
    return;
  }
  if (isParallelSuperfinish(node)) {
    if (handleId === 'in-2') params.station2InputBufferCount += amount;
    else params.station1InputBufferCount += amount;
    params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
    return;
  }
  if (isSerialSuperfinish(node)) {
    params.station1InputBufferCount += amount;
    params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
    return;
  }
  if (params.deviceType === 'storage_feeder') {
    const accepted = Math.min(amount, Math.max(0, params.storageCapacity - params.currentStorageCount));
    if (accepted <= 0) return;
    params.currentStorageCount += accepted;
    params.inputBufferCount = Math.min(params.inputBufferCapacity, params.currentStorageCount);
    return;
  }
  params.inputBufferCount += amount;
};

export const outputSpace = (node: FactoryNode) =>
  Math.max(0, node.data.params.outputBufferCapacity - node.data.params.outputBufferCount);

export const canReceiveInput = (node: FactoryNode, amount: number, handleId?: string | null) =>
  inputSpaceForHandle(node, handleId) >= amount;

export const outputBufferCountForHandle = (node: FactoryNode, handleId?: string | null) => {
  const { params } = node.data;
  if (isAssemblyStorage(node) || isSplitStorageFeeder(node)) {
    return handleId === 'out-2' ? params.assemblySmallStorageCount : params.assemblyBigStorageCount;
  }
  return params.outputBufferCount;
};

export const takeOutputFromHandle = (node: FactoryNode, amount: number, handleId?: string | null) => {
  const { params } = node.data;
  if (isAssemblyStorage(node) || isSplitStorageFeeder(node)) {
    if (handleId === 'out-2') params.assemblySmallStorageCount = Math.max(0, params.assemblySmallStorageCount - amount);
    else params.assemblyBigStorageCount = Math.max(0, params.assemblyBigStorageCount - amount);
    params.currentStorageCount = params.assemblyBigStorageCount + params.assemblySmallStorageCount;
    if (isAssemblyStorage(node)) params.inputBufferCount = params.currentStorageCount;
    params.outputBufferCount = params.currentStorageCount;
    return;
  }
  params.outputBufferCount = Math.max(0, params.outputBufferCount - amount);
};

export const edgeMovingQuantity = (edgeData: FlowEdgeData) =>
  edgeData.inTransit.reduce((sum, packet) => sum + packet.quantity, 0);

export const lineBufferFree = (edgeData: FlowEdgeData) =>
  Math.max(0, (edgeData.lineBufferCapacity ?? 0) - (edgeData.lineBufferCount ?? 0));

export const flushLineBufferToTarget = (edgeData: FlowEdgeData, target: FactoryNode, targetHandle?: string | null) => {
  if (!edgeData.allowBuffer || edgeData.lineBufferCount <= 0) return;
  const moved = Math.min(edgeData.lineBufferCount, inputSpaceForHandle(target, targetHandle));
  if (moved <= 0) return;
  addInputToHandle(target, moved, targetHandle);
  edgeData.lineBufferCount -= moved;
};

export const updateDerivedMetrics = (node: FactoryNode, elapsedSec: number) => {
  const derived = calculateDeviceMetrics(node.data.params);
  const observed = Math.max(elapsedSec, 1);
  node.data.metrics = {
    ...node.data.metrics,
    ...derived,
    simulationCapacityPerHour:
      elapsedSec > 0 ? (node.data.metrics.totalOutput / elapsedSec) * 3600 : 0,
    utilization: clamp(node.data.metrics.totalProcessingTime / observed, 0, 1),
    waitingRate: clamp(node.data.metrics.totalWaitingTime / observed, 0, 1),
    blockedRate: clamp(node.data.metrics.totalBlockedTime / observed, 0, 1),
    inputStarvedRate: clamp(node.data.metrics.totalWaitingTime / observed, 0, 1),
    outputFullRate: clamp(node.data.metrics.totalBlockedTime / observed, 0, 1),
  };
};

export const cloneSimulationNodes = (nodes: FactoryNode[]): FactoryNode[] =>
  nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      params: { ...node.data.params },
      metrics: { ...node.data.metrics },
      runtime: { ...node.data.runtime },
    },
  }));

export const cloneSimulationEdges = (edges: FactoryEdge[]): FactoryEdge[] =>
  edges.map((edge) => ({
    ...edge,
    data: edge.data
      ? {
          ...edge.data,
          inTransit: edge.data.inTransit.map((packet) => ({ ...packet })),
        }
      : edge.data,
  }));

export const rotateAfter = (items: string[], lastId: string) => {
  if (!lastId) return items;
  const index = items.indexOf(lastId);
  if (index < 0) return items;
  return [...items.slice(index + 1), ...items.slice(0, index + 1)];
};
