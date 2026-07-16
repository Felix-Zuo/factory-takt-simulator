import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFactoryStore } from '../../store/factoryStore';
import { useTwinStore } from '../../store/twinStore';

const severityTone = {
  critical: 'text-rose-200 border-rose-300/35',
  high: 'text-orange-200 border-orange-300/35',
  medium: 'text-amber-200 border-amber-300/35',
  low: 'text-sky-200 border-sky-300/35',
  info: 'text-slate-300 border-slate-700',
};

const stateTone = {
  active: 'border-amber-300/30 text-amber-100',
  acknowledged: 'border-sky-300/25 text-sky-200',
  cleared: 'border-emerald-300/25 text-emerald-200',
};

export function TwinAlarmsPanel() {
  const language = useFactoryStore((state) => state.settings.language);
  const selectNode = useFactoryStore((state) => state.selectNode);
  const zh = language === 'zh-CN';
  const { snapshot, selectAsset, setActiveTab } = useTwinStore();
  const active = snapshot.alarms.filter((alarm) => alarm.state === 'active');
  const ordered = [...snapshot.alarms].sort((left, right) => {
    if (left.state === 'active' && right.state !== 'active') return -1;
    if (left.state !== 'active' && right.state === 'active') return 1;
    return Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
  });

  return (
    <div className="p-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="text-xs font-semibold text-slate-100">{zh ? '报警与异常事件' : 'Alarms and exceptions'}</div>
          <div className="mt-1 text-[10px] text-slate-500">{zh ? '只读展示；确认与复位必须经过受控网关。' : 'Read-only; acknowledgement and reset require the controlled gateway.'}</div>
        </div>
        <div className={`text-lg font-semibold ${active.length ? 'text-amber-200' : 'text-emerald-200'}`}>{active.length}</div>
      </div>

      {snapshot.alarms.length === 0 ? (
        <div className="grid place-items-center py-16 text-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-300" />
          <div className="mt-3 text-xs font-semibold text-slate-200">{zh ? '当前没有报警记录' : 'No alarm records'}</div>
          <div className="mt-1 text-[10px] text-slate-600">{zh ? '设备、连接和派生节拍异常会显示在这里。' : 'Equipment, connection, and derived flow alarms appear here.'}</div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {ordered.map((alarm) => (
            <button
              type="button"
              key={alarm.id}
              className={`w-full rounded border bg-slate-900/52 p-3 text-left ${severityTone[alarm.severity]} ${alarm.state === 'active' ? '' : 'opacity-70'}`}
              onClick={() => {
                selectAsset(alarm.assetId);
                setActiveTab('assets');
                const nodeId = snapshot.assets.find((asset) => asset.assetId === alarm.assetId)?.nodeId;
                if (nodeId) selectNode(nodeId);
              }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[10px] font-semibold uppercase">{alarm.severity} · {alarm.code}</div>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase ${stateTone[alarm.state]}`}>
                      {alarm.state}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-100">{alarm.title}</div>
                  <div className="mt-1 text-[10px] leading-5 text-slate-400">{alarm.message}</div>
                  <div className="mt-2 text-[9px] text-slate-600">{alarm.source}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
