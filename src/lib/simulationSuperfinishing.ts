import { clamp, outputSpace, updateDerivedMetrics } from './simulationPrimitives';
import type { FactoryNode } from '../types/factory';

const canUseCalculatedStops = (node: FactoryNode) => node.data.params.taktMode !== 'manual';

const stationOutput = (node: FactoryNode, quantity: number) => {
  const { params, runtime } = node.data;
  const effectiveQuality = params.taktMode === 'manual' ? 1 : clamp(params.yieldRate * (1 - params.ngRate), 0, 1);
  const qualifiedWork = quantity * effectiveQuality + runtime.qualityCarry;
  const output = Math.floor(qualifiedWork);
  runtime.qualityCarry = qualifiedWork - output;
  if (canUseCalculatedStops(node)) runtime.processedSinceConsumable += quantity;
  return output;
};

const releaseFinalOutput = (node: FactoryNode, key: 'station1PendingOutput' | 'station2PendingOutput') => {
  const pending = node.data.runtime[key];
  if (pending <= 0) return true;
  if (outputSpace(node) < pending) return false;
  node.data.params.outputBufferCount += pending;
  node.data.metrics.totalOutput += pending;
  node.data.runtime[key] = 0;
  return true;
};

const syncSuperfinishInput = (node: FactoryNode) => {
  const { params } = node.data;
  params.station1InputBufferCount = Math.max(0, params.station1InputBufferCount ?? 0);
  params.station2InputBufferCount = Math.max(0, params.station2InputBufferCount ?? 0);

  const stationTotal = params.station1InputBufferCount + params.station2InputBufferCount;
  if (params.inputBufferCount > stationTotal) {
    let legacy = params.inputBufferCount - stationTotal;
    while (legacy > 0) {
      const preferStation2 =
        params.superfinishingMode === 'parallel_once' &&
        params.station2InputBufferCount < params.station2InputBufferCapacity &&
        params.station2InputBufferCount <= params.station1InputBufferCount;
      if (preferStation2) params.station2InputBufferCount += 1;
      else if (params.station1InputBufferCount < params.station1InputBufferCapacity) params.station1InputBufferCount += 1;
      else if (params.superfinishingMode === 'parallel_once' && params.station2InputBufferCount < params.station2InputBufferCapacity) {
        params.station2InputBufferCount += 1;
      } else {
        break;
      }
      legacy -= 1;
    }
  }
  params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
};

const tickConsumableStop = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;
  if (params.taktMode === 'manual') {
    runtime.maintenanceRemainingSec = 0;
    runtime.maintenanceKind = null;
    return false;
  }
  if (runtime.maintenanceRemainingSec > 0) {
    runtime.maintenanceRemainingSec = Math.max(0, runtime.maintenanceRemainingSec - dt);
    runtime.status = 'changing_consumable';
    metrics.totalConsumableTime += dt;
    if (runtime.maintenanceRemainingSec === 0) {
      runtime.processedSinceConsumable = 0;
      runtime.maintenanceKind = null;
    }
    updateDerivedMetrics(node, elapsedSec);
    return true;
  }
  const noStationRunning = runtime.station1ProcessRemainingSec <= 0 && runtime.station2ProcessRemainingSec <= 0;
  if (noStationRunning && params.consumableIntervalUnits > 0 && runtime.processedSinceConsumable >= params.consumableIntervalUnits) {
    runtime.maintenanceKind = 'changing_consumable';
    runtime.maintenanceRemainingSec = params.consumableChangeSec;
    runtime.status = 'changing_consumable';
    updateDerivedMetrics(node, elapsedSec);
    return true;
  }
  return false;
};

const tickParallelOnce = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;
  syncSuperfinishInput(node);

  if (!releaseFinalOutput(node, 'station1PendingOutput') || !releaseFinalOutput(node, 'station2PendingOutput')) {
    runtime.status = 'blocked';
    metrics.totalBlockedTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }
  if (tickConsumableStop(node, dt, elapsedSec)) return;

  let running = false;
  const tickStation = (station: 1 | 2) => {
    const remainingKey = station === 1 ? 'station1ProcessRemainingSec' : 'station2ProcessRemainingSec';
    const inputKey = station === 1 ? 'station1InputBufferCount' : 'station2InputBufferCount';
    const batch = Math.max(1, station === 1 ? params.station1BatchSize : params.station2BatchSize);
    const cycle = Math.max(0.2, station === 1 ? params.station1ProcessTimeSec : params.station2ProcessTimeSec);
    const pendingKey = station === 1 ? 'station1PendingOutput' : 'station2PendingOutput';

    if (runtime[remainingKey] > 0) {
      runtime[remainingKey] = Math.max(0, runtime[remainingKey] - dt);
      running = true;
      if (runtime[remainingKey] === 0) runtime[pendingKey] += stationOutput(node, batch);
      return;
    }

    if (runtime[pendingKey] > 0 || params[inputKey] < batch) return;
    params[inputKey] -= batch;
    params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
    metrics.totalInput += batch;
    runtime[remainingKey] = cycle;
    running = true;
  };

  tickStation(1);
  tickStation(2);

  if (running) {
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;
  } else if (params.station1InputBufferCount + params.station2InputBufferCount <= 0) {
    runtime.status = 'waiting_material';
    metrics.totalWaitingTime += dt;
  } else {
    runtime.status = 'idle';
  }
  updateDerivedMetrics(node, elapsedSec);
};

const tickSerialTwice = (node: FactoryNode, dt: number, elapsedSec: number) => {
  const { params, runtime, metrics } = node.data;
  syncSuperfinishInput(node);

  if (!releaseFinalOutput(node, 'station2PendingOutput')) {
    runtime.status = 'blocked';
    metrics.totalBlockedTime += dt;
    updateDerivedMetrics(node, elapsedSec);
    return;
  }
  if (runtime.station1PendingOutput > 0) {
    const free = Math.max(0, params.station2InputBufferCapacity - params.station2InputBufferCount);
    if (free >= runtime.station1PendingOutput) {
      params.station2InputBufferCount += runtime.station1PendingOutput;
      runtime.station1PendingOutput = 0;
      params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
    } else {
      runtime.status = 'blocked';
      metrics.totalBlockedTime += dt;
      updateDerivedMetrics(node, elapsedSec);
      return;
    }
  }
  if (tickConsumableStop(node, dt, elapsedSec)) return;

  let running = false;

  if (runtime.station2ProcessRemainingSec > 0) {
    runtime.station2ProcessRemainingSec = Math.max(0, runtime.station2ProcessRemainingSec - dt);
    running = true;
    if (runtime.station2ProcessRemainingSec === 0) {
      runtime.station2PendingOutput += stationOutput(node, Math.max(1, params.station2BatchSize));
    }
  } else if (params.station2InputBufferCount >= Math.max(1, params.station2BatchSize)) {
    const batch = Math.max(1, params.station2BatchSize);
    params.station2InputBufferCount -= batch;
    params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
    runtime.station2ProcessRemainingSec = Math.max(0.2, params.secondPassProcessTimeSec || params.station2ProcessTimeSec);
    running = true;
  }

  if (runtime.station1ProcessRemainingSec > 0) {
    runtime.station1ProcessRemainingSec = Math.max(0, runtime.station1ProcessRemainingSec - dt);
    running = true;
    if (runtime.station1ProcessRemainingSec === 0) runtime.station1PendingOutput += Math.max(1, params.station1BatchSize);
  } else if (runtime.station1PendingOutput <= 0 && params.station1InputBufferCount >= Math.max(1, params.station1BatchSize)) {
    const batch = Math.max(1, params.station1BatchSize);
    params.station1InputBufferCount -= batch;
    params.inputBufferCount = params.station1InputBufferCount + params.station2InputBufferCount;
    metrics.totalInput += batch;
    runtime.station1ProcessRemainingSec = Math.max(0.2, params.firstPassProcessTimeSec || params.station1ProcessTimeSec);
    running = true;
  }

  if (running) {
    runtime.status = 'running';
    metrics.totalProcessingTime += dt;
  } else if (params.station1InputBufferCount <= 0 && params.station2InputBufferCount <= 0) {
    runtime.status = 'waiting_material';
    metrics.totalWaitingTime += dt;
  } else {
    runtime.status = 'idle';
  }
  updateDerivedMetrics(node, elapsedSec);
};

export const tickSuperfinishingNode = (node: FactoryNode, dt: number, elapsedSec: number) => {
  if (node.data.params.processFamily !== 'superfinishing') return false;
  if (node.data.params.superfinishingMode === 'parallel_once') tickParallelOnce(node, dt, elapsedSec);
  else if (node.data.params.superfinishingMode === 'serial_twice') tickSerialTwice(node, dt, elapsedSec);
  else return false;
  node.data.params.inputBufferCount =
    node.data.params.station1InputBufferCount + node.data.params.station2InputBufferCount;
  updateDerivedMetrics(node, elapsedSec);
  return true;
};
