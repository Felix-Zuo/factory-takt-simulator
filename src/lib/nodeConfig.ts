import { createEmptyMetrics } from '../data/deviceCatalog';
import type { DeviceParameters, FactoryNode } from '../types/factory';

const SAME_TYPE_CONFIG_KEYS: Array<keyof DeviceParameters> = [
  'enabled',
  'taktMode',
  'manualTaktSec',
  'batchSize',
  'processTimeSec',
  'inputPortCount',
  'outputPortCount',
  'inputPortRules',
  'outputPortRules',
  'materialKind',
  'output1MaterialKind',
  'output2MaterialKind',
  'station1Enabled',
  'station1BatchSize',
  'station1ProcessTimeSec',
  'station1InputBufferCapacity',
  'station2Enabled',
  'station2BatchSize',
  'station2ProcessTimeSec',
  'station2InputBufferCapacity',
  'machineCount',
  'inputBufferCapacity',
  'outputBufferCapacity',
  'availability',
  'yieldRate',
  'ngRate',
  'shiftHours',
  'shiftsPerDay',
  'plannedOutput',
  'dressingIntervalUnits',
  'dressingDurationSec',
  'consumableIntervalUnits',
  'consumableChangeSec',
  'superfinishingMode',
  'firstPassProcessTimeSec',
  'secondPassProcessTimeSec',
  'storageCapacity',
  'feedBatchSize',
  'feedIntervalSec',
  'dryerColumnBatchSize',
  'dryerColumnCount',
  'dryerDryTimeSec',
  'assemblyBigStorageCapacity',
  'assemblySmallStorageCapacity',
  'cleanerLaneCount',
  'cleanerLaneCapacity',
  'cleanerPushIntervalSec',
  'cleanerAirBatchSize',
  'cleanerAirTimeSec',
];

export const mergeNodeParams = (node: FactoryNode, patch: Partial<DeviceParameters>): FactoryNode => {
  const params = { ...node.data.params, ...patch };
  return {
    ...node,
    data: {
      ...node.data,
      label: params.deviceShortName,
      params,
      metrics: {
        ...node.data.metrics,
        ...createEmptyMetrics(params),
        totalInput: node.data.metrics.totalInput,
        totalOutput: node.data.metrics.totalOutput,
        totalProcessingTime: node.data.metrics.totalProcessingTime,
        totalWaitingTime: node.data.metrics.totalWaitingTime,
        totalBlockedTime: node.data.metrics.totalBlockedTime,
        totalDressingTime: node.data.metrics.totalDressingTime,
        totalConsumableTime: node.data.metrics.totalConsumableTime,
      },
      runtime: {
        ...node.data.runtime,
        status: params.enabled ? node.data.runtime.status : 'stopped',
      },
    },
  };
};

export const buildSameTypeConfigPatch = (params: DeviceParameters): Partial<DeviceParameters> =>
  Object.fromEntries(SAME_TYPE_CONFIG_KEYS.map((key) => [key, params[key]])) as Partial<DeviceParameters>;

export const applySameTypeConfig = (
  nodes: FactoryNode[],
  sourceNodeId: string,
): { nodes: FactoryNode[]; changed: number; sourceLabel: string } => {
  const source = nodes.find((node) => node.id === sourceNodeId);
  if (!source) return { nodes, changed: 0, sourceLabel: '' };

  const patch = buildSameTypeConfigPatch(source.data.params);
  let changed = 0;
  const nextNodes = nodes.map((node) => {
    if (node.id === sourceNodeId || node.data.params.deviceType !== source.data.params.deviceType) return node;
    changed += 1;
    return mergeNodeParams(node, patch);
  });

  return {
    nodes: nextNodes,
    changed,
    sourceLabel: source.data.params.deviceShortName,
  };
};
