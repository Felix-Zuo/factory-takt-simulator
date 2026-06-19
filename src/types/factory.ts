import type { Edge, Node } from '@xyflow/react';

export type Language = 'zh-CN' | 'en';
export type ThemeMode = 'dark' | 'light';
export type AnimationIntensity = 'off' | 'low' | 'standard' | 'showcase';
export type CardDensity = 'compact' | 'standard';
export type MaterialKind = 'part_a' | 'part_b' | 'mixed';
export type SimulationTargetMode = 'time' | 'output';
export type TaktMode = 'calculated' | 'manual';
export type PortSide = 'input' | 'output';
export type PortMaterialFilter = MaterialKind | 'any';
export type PortRoutingStrategy =
  | 'auto'
  | 'round_robin'
  | 'force_round_robin'
  | 'skip_blocked'
  | 'wait_blocked'
  | 'lowest_inventory_first'
  | 'ratio'
  | 'material_split'
  | 'synchronized';
export type PortBlockedBehavior = 'skip_blocked' | 'wait_blocked';

export type DeviceType =
  | 'material_source'
  | 'storage_feeder'
  | 'merge_buffer'
  | 'wash_dry'
  | 'inspection_a'
  | 'inspection_b'
  | 'join_station'
  | 'fasten_station'
  | 'functional_check'
  | 'performance_check'
  | 'fill_station'
  | 'press_station'
  | 'visual_inspection'
  | 'manual_buffer'
  | 'surface_treatment'
  | 'packing_sink'
  | 'process_a'
  | 'process_b'
  | 'finishing'
  | 'finishing_b'
  | 'process_c'
  | 'spin_dryer'
  | 'robot'
  | 'conveyor'
  | 'qa_a'
  | 'qa_b'
  | 'qa_c'
  | 'final_qa'
  | 'general_inspection'
  | 'finished_sink';

export type ProcessFamily =
  | 'source'
  | 'feeder'
  | 'processing'
  | 'finishing'
  | 'inspection'
  | 'assembly'
  | 'cleaning'
  | 'buffer'
  | 'dryer'
  | 'transport'
  | 'sink';

export type DeviceStatus =
  | 'idle'
  | 'running'
  | 'waiting_material'
  | 'blocked'
  | 'dressing'
  | 'changing_consumable'
  | 'stopped'
  | 'fault'
  | 'arm_wait_pick'
  | 'arm_wait_space'
  | 'transporting';

export type FinishingMode = 'single_station_once' | 'parallel_once' | 'serial_twice';
export type MaintenanceKind = 'dressing' | 'changing_consumable' | null;
export type TransportType = 'conveyor' | 'loader_arm' | 'manual' | 'buffer_transfer';
export type ArmPhase = 'home' | 'picking' | 'moving' | 'placing' | 'returning';
export type EdgeShape = 'smooth' | 'orthogonal';
export type StageKey =
  | 'process_a'
  | 'finish_a'
  | 'process_b'
  | 'process_c'
  | 'finish_b'
  | 'general_inspection'
  | 'dryer'
  | 'source'
  | 'merge_buffer'
  | 'wash_dry'
  | 'line_inspection'
  | 'join'
  | 'fasten'
  | 'post_process'
  | 'packaging'
  | 'sink'
  | 'other';

export interface DeviceParameters {
  deviceName: string;
  deviceShortName: string;
  deviceType: DeviceType;
  processFamily: ProcessFamily;
  deviceCode: string;
  enabled: boolean;
  taktMode: TaktMode;
  manualTaktSec: number;
  batchSize: number;
  processTimeSec: number;
  inputPortCount: number;
  outputPortCount: number;
  inputPortRules: Record<string, PortRule>;
  outputPortRules: Record<string, PortRule>;
  materialKind: MaterialKind;
  output1MaterialKind: MaterialKind;
  output2MaterialKind: MaterialKind;
  station1Enabled: boolean;
  station1BatchSize: number;
  station1ProcessTimeSec: number;
  station1InputBufferCapacity: number;
  station1InputBufferCount: number;
  station2Enabled: boolean;
  station2BatchSize: number;
  station2ProcessTimeSec: number;
  station2InputBufferCapacity: number;
  station2InputBufferCount: number;
  machineCount: number;
  inputBufferCapacity: number;
  outputBufferCapacity: number;
  inputBufferCount: number;
  outputBufferCount: number;
  initialMaterials: number;
  availability: number;
  yieldRate: number;
  ngRate: number;
  shiftHours: number;
  shiftsPerDay: number;
  plannedOutput: number;
  dressingIntervalUnits: number;
  dressingDurationSec: number;
  consumableIntervalUnits: number;
  consumableChangeSec: number;
  finishingMode: FinishingMode;
  firstPassProcessTimeSec: number;
  secondPassProcessTimeSec: number;
  storageCapacity: number;
  currentStorageCount: number;
  feedBatchSize: number;
  feedIntervalSec: number;
  dryerColumnBatchSize: number;
  dryerColumnCount: number;
  dryerDryTimeSec: number;
  dryerLoadedColumns: number;
  dryerDriedColumns: number;
  partAStorageCapacity: number;
  partAStorageCount: number;
  partBStorageCapacity: number;
  partBStorageCount: number;
  cleanerLaneCount: number;
  cleanerLaneCapacity: number;
  cleanerPushIntervalSec: number;
  cleanerAirBatchSize: number;
  cleanerAirTimeSec: number;
  cleanerInternalCount: number;
  cleanerReadyCount: number;
}

export interface PortRule {
  enabled: boolean;
  label: string;
  materialFilter: PortMaterialFilter;
  routingStrategy: PortRoutingStrategy;
  blockedBehavior: PortBlockedBehavior;
  minBatch: number;
  maxBatch: number;
  priority: number;
  allocationRatio: number;
}

export interface SelectedPort {
  nodeId: string;
  side: PortSide;
  handleId: string;
}

export interface DeviceMetrics {
  totalInput: number;
  totalOutput: number;
  totalProcessingTime: number;
  totalWaitingTime: number;
  totalBlockedTime: number;
  totalDressingTime: number;
  totalConsumableTime: number;
  theoreticalCapacityPerHour: number;
  dailyEffectiveCapacity: number;
  averageSinglePieceTakt: number;
  simulationCapacityPerHour: number;
  utilization: number;
  waitingRate: number;
  blockedRate: number;
  inputStarvedRate: number;
  outputFullRate: number;
}

export interface DeviceRuntime {
  status: DeviceStatus;
  processRemainingSec: number;
  maintenanceRemainingSec: number;
  maintenanceKind: MaintenanceKind;
  pendingOutput: number;
  qualityCarry: number;
  processedSinceDressing: number;
  processedSinceConsumable: number;
  station1ProcessRemainingSec: number;
  station2ProcessRemainingSec: number;
  station1PendingOutput: number;
  station2PendingOutput: number;
  cleanerPushRemainingSec: number;
  cleanerAirRemainingSec: number;
  cleanerOutputQueue: number;
}

export interface DeviceNodeData extends Record<string, unknown> {
  label: string;
  params: DeviceParameters;
  metrics: DeviceMetrics;
  runtime: DeviceRuntime;
}

export interface MaterialPacket {
  id: string;
  quantity: number;
  remainingSec: number;
  totalSec: number;
}

export interface FlowEdgeData extends Record<string, unknown> {
  label: string;
  transportType: TransportType;
  edgeShape: EdgeShape;
  routeOffsetX: number;
  routeOffsetY: number;
  armGroupId: string;
  lastPickupSourceId: string;
  lastDropTargetId: string;
  batchSize: number;
  travelTimeSec: number;
  dispatchIntervalSec: number;
  isContinuous: boolean;
  allowBuffer: boolean;
  capacity: number;
  lineBufferCapacity: number;
  lineBufferCount: number;
  allocationRatio: number;
  triggerBatch: number;
  pickCount: number;
  pickTimeSec: number;
  moveTimeSec: number;
  placeTimeSec: number;
  returnTimeSec: number;
  waitForDownstreamSpace: boolean;
  waitForUpstreamBatch: boolean;
  armPhase: ArmPhase;
  phaseRemainingSec: number;
  carriedQuantity: number;
  inTransit: MaterialPacket[];
  utilization: number;
  waitPickTime: number;
  waitSpaceTime: number;
  warning?: string;
  visualHidden?: boolean;
  visualGroupPath?: string;
  visualGroupLabelX?: number;
  visualGroupLabelY?: number;
  visualGroupMemberCount?: number;
  visualGroupSourceCount?: number;
  visualGroupTargetCount?: number;
  visualRouteControlX?: number;
  visualRouteControlY?: number;
  visualArmX?: number;
  visualArmY?: number;
  visualArmPath?: string;
  visualArmProgress?: number;
  visualArmCarriedQuantity?: number;
  visualArmPhase?: ArmPhase;
}

export interface AppSettings {
  language: Language;
  themeMode: ThemeMode;
  animationIntensity: AnimationIntensity;
  cardDensity: CardDensity;
  snapToGrid: boolean;
  hideText: boolean;
  simulationTargetMode: SimulationTargetMode;
  simulationTargetHours: number;
  simulationTargetOutput: number;
  backgroundStepSec: number;
}

export interface PanelState {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  taktCollapsed: boolean;
  logCollapsed: boolean;
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
}

export type FactoryNode = Node<DeviceNodeData, 'deviceNode'>;
export type FactoryEdge = Edge<FlowEdgeData, 'flowEdge'>;

export interface SavedScenarioSummary {
  id: string;
  name: string;
  savedAt: string;
  nodeCount: number;
  edgeCount: number;
  elapsedSec: number;
}

export interface BottleneckIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  position: string;
  reason: string;
  risk: string;
  suggestions: string[];
}

export interface BottleneckResult {
  nodeId: string | null;
  label: string;
  reason: string;
  capacityPerHour: number;
  lineBalanceRate: number;
  recommendations: string[];
  issues: BottleneckIssue[];
}

export interface StageAnalysis {
  key: StageKey;
  label: string;
  nodeIds: string[];
  capacityPerHour: number;
  avgTaktSec: number;
  totalOutput: number;
  utilization: number;
  notes: string[];
}

export interface SimulationSummary {
  elapsedSec: number;
  theoreticalCapacityPerHour: number;
  simulationCapacityPerHour: number;
  bottleneck: BottleneckResult;
  statusCounts: Record<DeviceStatus, number>;
  stageAnalysis: StageAnalysis[];
}
