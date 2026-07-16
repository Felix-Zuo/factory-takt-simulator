export type TwinSourceMode = 'demo' | 'gateway';
export type TwinConnectionState = 'demo' | 'connecting' | 'connected' | 'degraded' | 'offline';
export type PlcMode = 'auto' | 'manual' | 'maintenance' | 'offline';
export type SignalQuality = 'good' | 'uncertain' | 'bad';
export type AlarmSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlarmState = 'active' | 'acknowledged' | 'cleared';
export type MachineActionName =
  | 'idle'
  | 'waiting'
  | 'load'
  | 'clamp'
  | 'process'
  | 'inspect'
  | 'transfer'
  | 'unload'
  | 'hold'
  | 'service'
  | 'fault';

export interface PlcState {
  mode: PlcMode;
  run: boolean;
  ready: boolean;
  fault: boolean;
  heartbeat: number;
  programState: string;
}

export interface MachineActionState {
  name: MachineActionName;
  progress: number;
  cycleId: string;
  startedAt: string | null;
}

export interface IndustrialSignal {
  id: string;
  label: string;
  tagPath: string;
  value: boolean | number | string;
  unit?: string;
  quality: SignalQuality;
  updatedAt: string;
}

export interface IndustrialActuator {
  id: string;
  label: string;
  tagPath: string;
  kind: 'solenoid' | 'motor' | 'servo' | 'relay';
  command: boolean | number | string;
  feedback: boolean | number | string;
  interlocked: boolean;
  quality: SignalQuality;
  updatedAt: string;
}

export interface IndustrialAssetState {
  assetId: string;
  nodeId: string;
  displayName: string;
  equipmentPath: string;
  source: 'demo' | 'ignition' | 'sparkplug' | 'mes-rest' | 'generic';
  plc: PlcState;
  action: MachineActionState;
  sensors: IndustrialSignal[];
  actuators: IndustrialActuator[];
  cycleCount: number;
  goodCount: number;
  rejectCount: number;
  lastUpdated: string;
}

export interface IndustrialAlarm {
  id: string;
  assetId: string;
  code: string;
  title: string;
  message: string;
  severity: AlarmSeverity;
  state: AlarmState;
  source: string;
  occurredAt: string;
  acknowledgedAt?: string;
  clearedAt?: string;
}

export interface IndustrialSnapshot {
  schemaVersion: '1.0';
  source: TwinSourceMode | 'ignition' | 'sparkplug' | 'mes-rest' | 'generic';
  generatedAt: string;
  sequence: number;
  assets: IndustrialAssetState[];
  alarms: IndustrialAlarm[];
}

export type AiAssistantMode = 'analyze' | 'teach' | 'explain';
export type AiCanvasActionType =
  | 'focus_node'
  | 'pause_simulation'
  | 'start_simulation'
  | 'set_simulation_speed'
  | 'set_process_time'
  | 'run_background_analysis';

export interface AiCanvasAction {
  type: AiCanvasActionType;
  targetId?: string;
  value?: number;
  label: string;
  reason: string;
}

export interface AiAssistantResult {
  answer: string;
  evidence: string[];
  assumptions: string[];
  actions: AiCanvasAction[];
  confidence: 'low' | 'medium' | 'high';
  source: 'deepseek-v4-flash' | 'local-rules';
  cached: boolean;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    remainingDailyTokens: number | null;
  };
}

export interface IndustrialCommandPreview {
  previewId: string;
  expiresAt: string;
  assetId: string;
  command: 'request_hold' | 'request_resume' | 'acknowledge_alarm' | 'reset_fault';
  requestedValue: boolean | string | number;
  impact: string;
  interlocks: string[];
  dryRun: boolean;
}
