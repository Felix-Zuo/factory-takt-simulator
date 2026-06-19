import type { DeviceMetrics, DeviceParameters, FlowEdgeData } from '../types/factory';

const positive = (value: number, fallback = 1) => {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
};

export const getBaseCycleTime = (params: DeviceParameters) => {
  if (params.taktMode === 'manual') return positive(params.manualTaktSec, params.processTimeSec || 13);
  if (params.deviceType === 'material_source') return params.feedIntervalSec;
  if (params.deviceType === 'finished_sink' || params.deviceType === 'packing_sink') return params.processTimeSec;
  if (params.deviceType === 'storage_feeder' || params.deviceType === 'merge_buffer') return params.feedIntervalSec;
  if (params.deviceType === 'wash_dry') {
    return (
      positive(params.cleanerPushIntervalSec, params.processTimeSec || 2.5) +
      positive(params.cleanerAirTimeSec, 3) / positive(params.cleanerAirBatchSize, 5)
    );
  }
  if (params.deviceType === 'spin_dryer') return params.dryerDryTimeSec;
  if (params.processFamily === 'finishing' && params.finishingMode === 'serial_twice') {
    return params.firstPassProcessTimeSec + params.secondPassProcessTimeSec;
  }
  return params.processTimeSec;
};

export const calculateStationTakts = (params: DeviceParameters) => {
  const station1Batch = positive(params.station1BatchSize ?? params.batchSize);
  const station1Time = positive(params.station1ProcessTimeSec ?? getBaseCycleTime(params));
  const station2Batch = positive(params.station2BatchSize ?? params.batchSize);
  const station2Time = positive(params.station2ProcessTimeSec ?? getBaseCycleTime(params));
  const station1Takt = params.station1Enabled === false ? 0 : station1Time / station1Batch;
  const station2Takt = params.station2Enabled ? station2Time / station2Batch : 0;
  if (params.processFamily === 'finishing') {
    if (params.finishingMode === 'single_station_once') {
      return {
        station1Takt,
        station2Takt: 0,
        combinedBaseTakt: station1Takt,
      };
    }
    if (params.finishingMode === 'serial_twice') {
      const firstPassTakt = positive(params.firstPassProcessTimeSec || station1Time) / station1Batch;
      const secondPassTakt = positive(params.secondPassProcessTimeSec || station2Time) / station2Batch;
      return {
        station1Takt: firstPassTakt,
        station2Takt: secondPassTakt,
        combinedBaseTakt: Math.max(firstPassTakt, secondPassTakt),
      };
    }
  }
  const capacityPerSec =
    (station1Takt > 0 ? 1 / station1Takt : 0) + (station2Takt > 0 ? 1 / station2Takt : 0);

  return {
    station1Takt,
    station2Takt,
    combinedBaseTakt: capacityPerSec > 0 ? 1 / capacityPerSec : 0,
  };
};

export const getProcessBatchSize = (params: DeviceParameters) =>
  Math.max(
    1,
    params.deviceType === 'storage_feeder'
      ? params.feedBatchSize
      : params.deviceType === 'material_source'
        ? params.feedBatchSize
      : params.deviceType === 'merge_buffer'
        ? params.feedBatchSize
      : params.deviceType === 'wash_dry'
        ? 1
      : params.deviceType === 'spin_dryer'
        ? params.dryerColumnBatchSize * params.dryerColumnCount
        : params.batchSize,
  );

export const getSimulationBatchSize = (params: DeviceParameters) => {
  if (params.taktMode === 'manual') return 1;
  const stationMode =
    params.processFamily === 'processing' ||
    params.processFamily === 'finishing' ||
    params.processFamily === 'inspection' ||
    params.processFamily === 'assembly';
  return stationMode ? 1 : getProcessBatchSize(params);
};

export const getSimulationCycleTime = (params: DeviceParameters) => {
  if (params.taktMode === 'manual') return positive(params.manualTaktSec, params.processTimeSec || 13);
  const stationMode =
    params.processFamily === 'processing' ||
    params.processFamily === 'finishing' ||
    params.processFamily === 'inspection' ||
    params.processFamily === 'assembly';
  const stationTakt = calculateStationTakts(params);
  return stationMode && stationTakt.combinedBaseTakt > 0
    ? stationTakt.combinedBaseTakt
    : getBaseCycleTime(params);
};

export const calculateAverageTakt = (params: DeviceParameters) => {
  if (params.taktMode === 'manual') {
    const manualTakt = positive(params.manualTaktSec, params.processTimeSec || 13);
    return {
      baseSinglePieceTakt: manualTakt,
      dressingAmortized: 0,
      consumableAmortized: 0,
      averageSinglePieceTakt: manualTakt,
    };
  }
  const batchSize = getProcessBatchSize(params);
  const stationTakt = calculateStationTakts(params);
  const canUseStationTakt =
    params.processFamily === 'processing' ||
    params.processFamily === 'finishing' ||
    params.processFamily === 'inspection';
  const baseSinglePieceTakt =
    canUseStationTakt && stationTakt.combinedBaseTakt > 0
      ? stationTakt.combinedBaseTakt
      : getBaseCycleTime(params) / batchSize;
  const isProcessing = params.processFamily === 'processing';

  const dressingAmortized =
    isProcessing && params.dressingIntervalUnits > 0
      ? params.dressingDurationSec / positive(params.dressingIntervalUnits)
      : 0;

  const consumableAmortized =
    (isProcessing || params.processFamily === 'finishing') && params.consumableIntervalUnits > 0
      ? params.consumableChangeSec / positive(params.consumableIntervalUnits)
      : 0;

  return {
    baseSinglePieceTakt,
    dressingAmortized,
    consumableAmortized,
    averageSinglePieceTakt: baseSinglePieceTakt + dressingAmortized + consumableAmortized,
  };
};

export const calculateDeviceMetrics = (
  params: DeviceParameters,
): Pick<
  DeviceMetrics,
  | 'theoreticalCapacityPerHour'
  | 'dailyEffectiveCapacity'
  | 'averageSinglePieceTakt'
  | 'simulationCapacityPerHour'
  | 'utilization'
  | 'waitingRate'
  | 'blockedRate'
> => {
  if (!params.enabled) {
    return {
      theoreticalCapacityPerHour: 0,
      dailyEffectiveCapacity: 0,
      averageSinglePieceTakt: 0,
      simulationCapacityPerHour: 0,
      utilization: 0,
      waitingRate: 0,
      blockedRate: 0,
    };
  }

  const { averageSinglePieceTakt } = calculateAverageTakt(params);
  const effectiveQuality =
    params.taktMode === 'manual' ? 1 : Math.max(0, Math.min(1, params.yieldRate * (1 - params.ngRate)));
  const effectiveAvailability = params.taktMode === 'manual' ? 1 : Math.max(0, params.availability);
  const singleMachineCapacity = averageSinglePieceTakt > 0 ? 3600 / averageSinglePieceTakt : 0;
  const theoreticalCapacityPerHour =
    singleMachineCapacity * positive(params.machineCount) * effectiveAvailability * effectiveQuality;
  const dailyEffectiveCapacity =
    theoreticalCapacityPerHour * positive(params.shiftHours) * positive(params.shiftsPerDay);

  return {
    theoreticalCapacityPerHour,
    dailyEffectiveCapacity,
    averageSinglePieceTakt,
    simulationCapacityPerHour: 0,
    utilization: 0,
    waitingRate: 0,
    blockedRate: 0,
  };
};

export const getEdgeCycleTime = (edge: FlowEdgeData) => {
  if (edge.transportType === 'loader_arm') {
    return edge.pickTimeSec + edge.moveTimeSec + edge.placeTimeSec + edge.returnTimeSec;
  }
  return edge.dispatchIntervalSec > 0 ? edge.dispatchIntervalSec : edge.travelTimeSec;
};

export const getEdgeBatchSize = (edge: FlowEdgeData) =>
  edge.transportType === 'loader_arm' ? Math.max(1, edge.pickCount) : Math.max(1, edge.batchSize);

export const calculateEdgeCapacityPerHour = (edge: FlowEdgeData) => {
  const singlePieceTakt = getEdgeCycleTime(edge) / getEdgeBatchSize(edge);
  return singlePieceTakt > 0 ? 3600 / singlePieceTakt : 0;
};

export const formatNumber = (value: number, digits = 1) => {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};

export const getTaktFormulaNotes = (params: DeviceParameters, language: 'zh-CN' | 'en' = 'zh-CN') => {
  const takt = calculateAverageTakt(params);
  const zh = language === 'zh-CN';
  if (params.taktMode === 'manual') {
    return [
      zh
        ? `直接单件节拍 = ${formatNumber(takt.averageSinglePieceTakt, 2)}s`
        : `Manual single-piece takt = ${formatNumber(takt.averageSinglePieceTakt, 2)}s`,
      zh
        ? '简化模式：不仿真修整、换耗材和良率损失。'
        : 'Simplified mode: dressing, consumable change, and yield loss are skipped.',
    ];
  }
  const notes = [
    zh
      ? `基础单件节拍 = ${formatNumber(takt.baseSinglePieceTakt, 2)}s`
      : `Base takt = ${formatNumber(takt.baseSinglePieceTakt, 2)}s`,
  ];

  if (takt.dressingAmortized > 0) {
    notes.push(
      zh
        ? `修整摊销 = ${formatNumber(takt.dressingAmortized, 2)}s/件`
        : `Dressing amortized = ${formatNumber(takt.dressingAmortized, 2)}s/pc`,
    );
  }

  if (takt.consumableAmortized > 0) {
    notes.push(
      zh
        ? `耗材摊销 = ${formatNumber(takt.consumableAmortized, 2)}s/件`
        : `Consumable amortized = ${formatNumber(takt.consumableAmortized, 2)}s/pc`,
    );
  }

  notes.push(
    zh
      ? `综合平均单件节拍 = ${formatNumber(takt.averageSinglePieceTakt, 2)}s`
      : `Average takt = ${formatNumber(takt.averageSinglePieceTakt, 2)}s`,
  );

  return notes;
};
