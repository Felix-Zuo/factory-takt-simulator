import type { FactoryNode } from '../../types/factory';
import type {
  IndustrialAlarm,
  IndustrialAssetState,
  IndustrialSnapshot,
  MachineActionName,
} from '../../types/industrial';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const cycleDuration = (node: FactoryNode) => {
  const { params } = node.data;
  return Math.max(
    0.1,
    params.deviceType === 'spin_dryer'
      ? params.dryerDryTimeSec
      : params.deviceType === 'wash_dry'
        ? params.cleanerPushIntervalSec
        : params.processTimeSec,
  );
};

const actionForNode = (node: FactoryNode): MachineActionName => {
  const { status } = node.data.runtime;
  if (status === 'fault') return 'fault';
  if (status === 'blocked' || status === 'arm_wait_space') return 'hold';
  if (status === 'waiting_material' || status === 'arm_wait_pick') return 'waiting';
  if (status === 'dressing' || status === 'changing_consumable') return 'service';
  if (status === 'transporting') return 'transfer';
  if (status !== 'running') return 'idle';
  if (node.data.params.processFamily === 'inspection') return 'inspect';
  if (node.data.params.processFamily === 'transport') return 'transfer';
  if (node.data.params.processFamily === 'source' || node.data.params.processFamily === 'feeder') return 'load';
  if (node.data.params.processFamily === 'sink') return 'unload';
  return 'process';
};

const actionProgress = (node: FactoryNode) => {
  const { runtime } = node.data;
  if (runtime.status !== 'running') return runtime.pendingOutput > 0 ? 1 : 0;
  return clamp01(1 - runtime.processRemainingSec / cycleDuration(node));
};

const alarmForNode = (node: FactoryNode, now: string): IndustrialAlarm | null => {
  const { params, runtime, metrics } = node.data;
  if (runtime.status === 'fault') {
    return {
      id: `${node.id}:fault`,
      assetId: node.id,
      code: 'PLC-FAULT',
      title: `${params.deviceShortName} fault`,
      message: 'PLC fault input is active. Review interlocks and equipment diagnostics.',
      severity: 'critical',
      state: 'active',
      source: 'demo/plc/fault',
      occurredAt: now,
    };
  }
  if (runtime.status === 'blocked' && metrics.totalBlockedTime >= 30) {
    return {
      id: `${node.id}:blocked`,
      assetId: node.id,
      code: 'FLOW-BLOCKED',
      title: `${params.deviceShortName} downstream blocked`,
      message: 'Output release has remained blocked for at least 30 simulated seconds.',
      severity: 'medium',
      state: 'active',
      source: 'demo/derived/flow',
      occurredAt: now,
    };
  }
  return null;
};

const buildAsset = (node: FactoryNode, elapsedSec: number, now: string): IndustrialAssetState => {
  const { params, runtime, metrics } = node.data;
  const action = actionForNode(node);
  const isActive = action !== 'idle' && action !== 'waiting' && action !== 'hold' && action !== 'fault';
  const partPresent = params.inputBufferCount > 0 || runtime.pendingOutput > 0 || runtime.status === 'running';
  const outputReady = params.outputBufferCount > 0 || runtime.pendingOutput > 0;
  const root = `[default]Enterprise/Site-A/Area-01/Line-01/${params.deviceCode}`;
  const cycleCount = Math.max(0, metrics.totalOutput);
  const rejectCount = Math.min(cycleCount, Math.max(0, Math.round(cycleCount * params.ngRate)));
  const progress = actionProgress(node);

  return {
    assetId: node.id,
    nodeId: node.id,
    displayName: params.deviceShortName,
    equipmentPath: `Enterprise/Site-A/Area-01/Line-01/${params.deviceCode}`,
    source: 'demo',
    plc: {
      mode: runtime.status === 'fault' ? 'maintenance' : params.enabled ? 'auto' : 'offline',
      run: isActive,
      ready: params.enabled && runtime.status !== 'fault' && runtime.status !== 'stopped',
      fault: runtime.status === 'fault',
      heartbeat: Math.floor(elapsedSec) % 2,
      programState: runtime.status.toUpperCase(),
    },
    action: {
      name: action,
      progress,
      cycleId: `${params.deviceCode}-${cycleCount + (runtime.status === 'running' ? 1 : 0)}`,
      startedAt: runtime.status === 'running'
        ? new Date(Date.parse(now) - progress * cycleDuration(node) * 1000).toISOString()
        : null,
    },
    sensors: [
      {
        id: `${node.id}:part-present`,
        label: 'Part present',
        tagPath: `${root}/DI/PartPresent`,
        value: partPresent,
        quality: 'good',
        updatedAt: now,
      },
      {
        id: `${node.id}:output-ready`,
        label: 'Output ready',
        tagPath: `${root}/DI/OutputReady`,
        value: outputReady,
        quality: 'good',
        updatedAt: now,
      },
      {
        id: `${node.id}:buffer-level`,
        label: 'Buffer level',
        tagPath: `${root}/AI/BufferLevel`,
        value: params.inputBufferCount + params.outputBufferCount,
        unit: 'pcs',
        quality: 'good',
        updatedAt: now,
      },
    ],
    actuators: [
      {
        id: `${node.id}:clamp-valve`,
        label: 'Clamp valve',
        tagPath: `${root}/DO/ClampValve`,
        kind: 'solenoid',
        command: action === 'clamp' || action === 'process' || action === 'inspect',
        feedback: action === 'clamp' || action === 'process' || action === 'inspect',
        interlocked: runtime.status === 'fault',
        quality: 'good',
        updatedAt: now,
      },
      {
        id: `${node.id}:drive`,
        label: params.processFamily === 'transport' ? 'Conveyor drive' : 'Machine drive',
        tagPath: `${root}/DO/DriveRun`,
        kind: 'motor',
        command: isActive,
        feedback: isActive,
        interlocked: runtime.status === 'fault' || runtime.status === 'blocked',
        quality: 'good',
        updatedAt: now,
      },
    ],
    cycleCount,
    goodCount: cycleCount - rejectCount,
    rejectCount,
    lastUpdated: now,
  };
};

export const buildDemoTwinSnapshot = (
  nodes: FactoryNode[],
  elapsedSec: number,
  sequence: number,
): IndustrialSnapshot => {
  const now = new Date().toISOString();
  const activeNodes = nodes.filter((node) => node.data.params.enabled).slice(0, 500);
  return {
    schemaVersion: '1.0',
    source: 'demo',
    generatedAt: now,
    sequence,
    assets: activeNodes.map((node) => buildAsset(node, elapsedSec, now)),
    alarms: activeNodes.map((node) => alarmForNode(node, now)).filter(Boolean) as IndustrialAlarm[],
  };
};
