import { AlertOctagon, BarChart3, ChevronDown, ChevronUp, ClipboardList, Factory, TimerReset } from 'lucide-react';
import { statusLabels } from '../../data/deviceCatalog';
import { t } from '../../i18n/text';
import { formatNumber } from '../../lib/takt';
import { useFactoryStore } from '../../store/factoryStore';
import { MetricCard } from '../ui/MetricCard';

export function BottomTelemetry() {
  const { nodes, summary, settings, panels, togglePanel, logs, records } = useFactoryStore();
  const outputRanking = [...nodes]
    .filter((node) => node.data.params.enabled)
    .sort((a, b) => b.data.metrics.totalOutput - a.data.metrics.totalOutput)
    .slice(0, 5);

  const utilizationRanking = [...nodes]
    .filter((node) => node.data.params.enabled)
    .sort((a, b) => b.data.metrics.utilization - a.data.metrics.utilization)
    .slice(0, 5);

  if (panels.bottomCollapsed) {
    return (
      <footer className="flex h-10 shrink-0 items-center justify-between border-t border-slate-800 bg-slate-950/96 px-3">
        <div className="text-xs text-slate-500">{t(settings.language, 'bottomPanel')} {t(settings.language, 'collapse')}</div>
        <button
          className="inline-flex items-center gap-2 rounded border border-slate-800 px-2 py-1 text-xs text-slate-300 hover:border-cyan-300 hover:text-cyan-100"
          onClick={() => togglePanel('bottomCollapsed')}
        >
          <ChevronUp className="h-4 w-4" />
          {t(settings.language, 'expand')}
        </button>
      </footer>
    );
  }

  return (
    <footer
      className="min-h-0 shrink-0 overflow-x-auto overflow-y-hidden border-t border-slate-800 bg-slate-950/96 p-2.5"
      style={{ height: panels.bottomHeight }}
    >
      <div className="grid h-full min-w-[1080px] grid-cols-[300px_300px_420px_320px] gap-2">
      <section className="min-h-0 overflow-y-auto rounded border border-slate-800 bg-slate-900/50 p-2.5">
        <PanelHeader icon={<TimerReset className="h-4 w-4 text-cyan-200" />} title={t(settings.language, 'taktCalculator')} onCollapse={() => togglePanel('bottomCollapsed')} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <MetricCard label={t(settings.language, 'capacity')} value={formatNumber(summary.theoreticalCapacityPerHour, 1)} hint="pcs/h" tone="info" />
          <MetricCard label={t(settings.language, 'simulationCapacity')} value={formatNumber(summary.simulationCapacityPerHour, 1)} hint="pcs/h" tone="good" />
          <MetricCard label={t(settings.language, 'bottleneck')} value={summary.bottleneck.label} tone="warn" />
          <MetricCard label={t(settings.language, 'lineBalance')} value={`${formatNumber(summary.bottleneck.lineBalanceRate * 100, 1)}%`} tone="purple" />
        </div>
      </section>

      <section className="min-h-0 overflow-y-auto rounded border border-slate-800 bg-slate-900/50 p-2.5">
        <PanelHeader icon={<BarChart3 className="h-4 w-4 text-emerald-200" />} title={t(settings.language, 'simulationStats')} />
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
          {Object.entries(summary.statusCounts).map(([status, count]) => (
            <div key={status} className="rounded border border-slate-800 bg-slate-950/55 p-1.5">
              <div className="truncate text-[10px] text-slate-500">
                {settings.language === 'zh-CN' ? statusLabels[status as keyof typeof statusLabels].zh : statusLabels[status as keyof typeof statusLabels].short}
              </div>
              <div className="mt-1 text-base font-semibold text-slate-100">{count}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid min-h-0 grid-cols-2 gap-2">
        <div className="min-h-0 overflow-y-auto rounded border border-slate-800 bg-slate-900/50 p-2.5">
          <PanelHeader icon={<Factory className="h-4 w-4 text-sky-200" />} title={t(settings.language, 'outputRanking')} />
          <div className="mt-2 space-y-2">
            {outputRanking.map((node) => (
              <ProgressRow
                key={node.id}
                label={node.data.params.deviceShortName}
                value={node.data.metrics.totalOutput}
                max={Math.max(1, outputRanking[0]?.data.metrics.totalOutput ?? 1)}
                suffix="pcs"
              />
            ))}
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto rounded border border-slate-800 bg-slate-900/50 p-2.5">
          <PanelHeader icon={<AlertOctagon className="h-4 w-4 text-amber-200" />} title={t(settings.language, 'utilizationRanking')} />
          <div className="mt-2 space-y-2">
            {utilizationRanking.map((node) => (
              <ProgressRow
                key={node.id}
                label={node.data.params.deviceShortName}
                value={node.data.metrics.utilization * 100}
                max={100}
                suffix="%"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="min-h-0 overflow-y-auto rounded border border-slate-800 bg-slate-900/50 p-2.5">
        <PanelHeader icon={<ClipboardList className="h-4 w-4 text-violet-200" />} title="Log" onCollapse={() => togglePanel('logCollapsed')} />
        {panels.logCollapsed ? (
          <button
            className="mt-4 inline-flex items-center gap-2 rounded border border-slate-800 px-2 py-1 text-xs text-slate-300 hover:border-cyan-300"
            onClick={() => togglePanel('logCollapsed')}
          >
            <ChevronDown className="h-4 w-4" />
            {t(settings.language, 'expand')}
          </button>
        ) : (
          <div className="mt-2 max-h-[128px] space-y-2 overflow-y-auto text-[11px] text-slate-400">
            {records.length > 0 ? (
              <div className="rounded border border-cyan-300/18 bg-cyan-300/8 p-2 text-cyan-100">
                {settings.language === 'zh-CN' ? '最近记录' : 'Latest record'}: {records[0].finishedOutput} pcs ·{' '}
                {records[0].bottleneck}
              </div>
            ) : null}
            <div className="space-y-1">
              {logs.slice(0, 10).map((log, index) => (
                <div key={`${log}-${index}`}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </section>
      </div>
    </footer>
  );
}

function PanelHeader({ icon, title, onCollapse }: { icon: React.ReactNode; title: string; onCollapse?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-100">
      <div className="flex items-center gap-2">
        {icon}
        <span className="truncate">{title}</span>
      </div>
      {onCollapse ? (
        <button className="text-slate-500 hover:text-cyan-100" onClick={onCollapse}>
          <ChevronDown className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix: string;
}) {
  const width = Math.max(3, Math.min(100, (value / max) * 100));
  return (
    <div className="text-xs">
      <div className="mb-1 flex items-center justify-between gap-2 text-slate-400">
        <span className="truncate">{label}</span>
        <span className="text-slate-200">
          {formatNumber(value, suffix === '%' ? 1 : 0)} {suffix}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-800">
        <div className="h-full rounded bg-cyan-300" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
