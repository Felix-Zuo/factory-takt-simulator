import { createEmptyMetrics, createRuntime } from '../data/deviceCatalog';
import type { FactoryNode } from '../types/factory';

export const resetNodeForSimulation = (node: FactoryNode): FactoryNode => {
  const params = {
    ...node.data.params,
    currentStorageCount:
      node.data.params.deviceType === 'storage_feeder'
        ? node.data.params.initialMaterials
        : node.data.params.currentStorageCount,
    inputBufferCount:
      node.data.params.deviceType === 'storage_feeder' ? 0 : node.data.params.inputBufferCount,
    outputBufferCount: 0,
    station1InputBufferCount: 0,
    station2InputBufferCount: 0,
    dryerLoadedColumns: 0,
    dryerDriedColumns: 0,
    assemblyBigStorageCount: 0,
    assemblySmallStorageCount: 0,
    cleanerInternalCount: 0,
    cleanerReadyCount: 0,
  };

  return {
    ...node,
    data: {
      ...node.data,
      params,
      metrics: createEmptyMetrics(params),
      runtime: createRuntime(params.enabled ? 'idle' : 'stopped'),
    },
  };
};
