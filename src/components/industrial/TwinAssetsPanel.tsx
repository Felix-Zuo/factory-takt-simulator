import { Activity, Cpu, Focus, Gauge, ToggleLeft } from 'lucide-react';
import { useFactoryStore } from '../../store/factoryStore';
import { useTwinStore } from '../../store/twinStore';

const boolText = (value: boolean | number | string) =>
  typeof value === 'boolean' ? (value ? 'ON' : 'OFF') : String(value);

export function TwinAssetsPanel() {
  const language = useFactoryStore((state) => state.settings.language);
  const selectNode = useFactoryStore((state) => state.selectNode);
  const zh = language === 'zh-CN';
  const { snapshot, selectedAssetId, selectAsset } = useTwinStore();
  const asset = snapshot.assets.find((item) => item.assetId === selectedAssetId) ?? snapshot.assets[0];
  const activeAlarms = snapshot.alarms.filter((alarm) => alarm.state === 'active');
  const activeAlarmIds = new Set(activeAlarms.map((alarm) => alarm.assetId));

  return (
    <div className="p-3">
      <div className="grid grid-cols-3 border-y border-slate-800 py-3 text-center">
        <TwinMetric label={zh ? '资产' : 'Assets'} value={snapshot.assets.length} />
        <TwinMetric label={zh ? '运行' : 'Running'} value={snapshot.assets.filter((item) => item.plc.run).length} />
        <TwinMetric label={zh ? '活动报警' : 'Active alarms'} value={activeAlarms.length} warn={activeAlarms.length > 0} />
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase text-slate-500">{zh ? '设备清单' : 'Equipment assets'}</div>
      <div className="mt-2 max-h-40 overflow-y-auto border-y border-slate-800">
        {snapshot.assets.map((item) => (
          <button
            type="button"
            key={item.assetId}
            className={`flex w-full items-center justify-between gap-3 border-b border-slate-800 px-2 py-2 text-left last:border-b-0 ${
              item.assetId === asset?.assetId ? 'bg-cyan-300/8' : 'hover:bg-slate-900/72'
            }`}
            onClick={() => selectAsset(item.assetId)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${item.plc.fault ? 'bg-rose-300' : item.plc.run ? 'bg-emerald-300' : 'bg-slate-600'}`} />
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold text-slate-200">{item.displayName}</div>
                <div className="truncate text-[9px] text-slate-600">{item.equipmentPath}</div>
              </div>
            </div>
            <span className={`text-[9px] font-semibold uppercase ${activeAlarmIds.has(item.assetId) ? 'text-amber-200' : 'text-slate-500'}`}>
              {item.action.name}
            </span>
          </button>
        ))}
      </div>

      {asset ? (
        <div className="mt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100">{asset.displayName}</div>
              <div className="mt-1 truncate text-[10px] text-slate-500">{asset.equipmentPath}</div>
            </div>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-700 px-2 text-[10px] font-semibold text-slate-300 hover:border-cyan-300/60 hover:text-cyan-100"
              onClick={() => selectNode(asset.nodeId)}
            >
              <Focus className="h-3.5 w-3.5" />
              {zh ? '定位' : 'Focus'}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-px overflow-hidden rounded border border-slate-800 bg-slate-800">
            <StateCell icon={<Cpu className="h-3 w-3" />} label="PLC" value={asset.plc.mode.toUpperCase()} />
            <StateCell icon={<Activity className="h-3 w-3" />} label={zh ? '动作' : 'Action'} value={asset.action.name.toUpperCase()} />
            <StateCell icon={<Gauge className="h-3 w-3" />} label={zh ? '周期' : 'Cycles'} value={String(asset.cycleCount)} />
            <StateCell icon={<ToggleLeft className="h-3 w-3" />} label={zh ? '心跳' : 'Heartbeat'} value={String(asset.plc.heartbeat)} />
          </div>
          <div className="mt-2 rounded border border-slate-800 bg-slate-900/40 px-2.5 py-2">
            <div className="flex items-center justify-between text-[9px] text-slate-500">
              <span>{zh ? '当前动作进度' : 'Current action progress'}</span>
              <span className="font-semibold text-cyan-100">{Math.round(asset.action.progress * 100)}%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded bg-slate-800">
              <div className="h-full bg-cyan-300 transition-[width] duration-300" style={{ width: `${asset.action.progress * 100}%` }} />
            </div>
          </div>

          <div className="mt-4 text-[10px] font-semibold uppercase text-slate-500">{zh ? '传感器状态' : 'Sensor state'}</div>
          <div className="mt-1 border-y border-slate-800">
            {asset.sensors.map((signal) => (
              <SignalRow key={signal.id} label={signal.label} value={`${boolText(signal.value)}${signal.unit ? ` ${signal.unit}` : ''}`} quality={signal.quality} path={signal.tagPath} />
            ))}
          </div>

          <div className="mt-4 text-[10px] font-semibold uppercase text-slate-500">{zh ? '执行器反馈' : 'Actuator feedback'}</div>
          <div className="mt-1 border-y border-slate-800">
            {asset.actuators.map((actuator) => {
              const mismatched = actuator.command !== actuator.feedback;
              return (
                <SignalRow
                  key={actuator.id}
                  label={actuator.label}
                  value={`${boolText(actuator.command)} / ${boolText(actuator.feedback)}`}
                  quality={actuator.interlocked || mismatched ? 'uncertain' : actuator.quality}
                  path={actuator.tagPath}
                  suffix={
                    actuator.interlocked
                      ? (zh ? '联锁' : 'INTERLOCK')
                      : mismatched
                        ? (zh ? '指令/反馈不一致' : 'MISMATCH')
                        : actuator.kind.toUpperCase()
                  }
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-slate-600">{zh ? '等待设备状态流。' : 'Waiting for asset state stream.'}</div>
      )}
    </div>
  );
}

function TwinMetric({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <div className={`text-lg font-semibold ${warn ? 'text-amber-200' : 'text-slate-100'}`}>{value}</div>
      <div className="mt-0.5 text-[9px] text-slate-600">{label}</div>
    </div>
  );
}

function StateCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 bg-slate-950 px-2 py-2">
      <div className="flex items-center gap-1 text-[9px] text-slate-600">{icon}{label}</div>
      <div className="mt-1 truncate text-[9px] font-semibold text-cyan-100" title={value}>{value}</div>
    </div>
  );
}

function SignalRow({ label, value, quality, path, suffix }: { label: string; value: string; quality: 'good' | 'uncertain' | 'bad'; path: string; suffix?: string }) {
  const tone = quality === 'good' ? 'bg-emerald-300' : quality === 'uncertain' ? 'bg-amber-300' : 'bg-rose-300';
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-1 py-2 last:border-b-0" title={path}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
        <div className="min-w-0">
          <div className="truncate text-[10px] text-slate-300">{label}</div>
          <div className="truncate text-[8px] text-slate-600">{path}</div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[10px] font-semibold text-slate-100">{value}</div>
        {suffix ? <div className="text-[8px] text-slate-600">{suffix}</div> : null}
      </div>
    </div>
  );
}
