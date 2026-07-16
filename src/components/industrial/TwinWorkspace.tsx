import { AnimatePresence, motion } from 'framer-motion';
import { Activity, AlarmClock, Bot, Cable, RadioTower, X } from 'lucide-react';
import { useFactoryStore } from '../../store/factoryStore';
import { useTwinStore } from '../../store/twinStore';
import { TwinAlarmsPanel } from './TwinAlarmsPanel';
import { TwinAssetsPanel } from './TwinAssetsPanel';
import { TwinAssistantPanel } from './TwinAssistantPanel';
import { TwinConnectionPanel } from './TwinConnectionPanel';

const tabIcons = {
  assets: Activity,
  alarms: AlarmClock,
  assistant: Bot,
  connection: Cable,
};

export function TwinWorkspace() {
  const language = useFactoryStore((state) => state.settings.language);
  const zh = language === 'zh-CN';
  const {
    dockOpen,
    activeTab,
    setDockOpen,
    setActiveTab,
    connectionState,
    snapshot,
  } = useTwinStore();
  const activeAlarms = snapshot.alarms.filter((alarm) => alarm.state === 'active');
  const statusTone =
    connectionState === 'connected' || connectionState === 'demo'
      ? 'bg-emerald-300'
      : connectionState === 'connecting' || connectionState === 'degraded'
        ? 'bg-amber-300'
        : 'bg-rose-300';
  const tabs = [
    ['assets', zh ? '资产' : 'Assets'],
    ['alarms', zh ? '报警' : 'Alarms'],
    ['assistant', zh ? 'AI 分析' : 'AI'],
    ['connection', zh ? '接入' : 'Connect'],
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 z-30" data-testid="twin-workspace">
      {!dockOpen ? (
        <button
          type="button"
          data-testid="twin-status-rail"
          className="pointer-events-auto absolute right-3 top-3 flex h-10 items-center gap-2 rounded border border-slate-700 bg-slate-950/92 px-3 text-[11px] font-semibold text-slate-100 shadow-xl shadow-black/30 backdrop-blur transition hover:border-cyan-300/65"
          onClick={() => setDockOpen(true)}
          title={zh ? '打开实时数字孪生控制台' : 'Open live digital twin console'}
        >
          <RadioTower className="h-4 w-4 text-cyan-200" />
          <span className={`h-2 w-2 rounded-full ${statusTone}`} />
          <span>{connectionState === 'demo' ? 'TWIN DEMO' : 'LIVE TWIN'}</span>
          <span className="text-slate-500">{snapshot.assets.length} assets</span>
          {activeAlarms.length > 0 ? <span className="text-amber-200">{activeAlarms.length} alarms</span> : null}
        </button>
      ) : null}

      <AnimatePresence>
        {dockOpen ? (
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="pointer-events-auto absolute bottom-3 right-3 top-3 flex w-[390px] max-w-[calc(100%-24px)] flex-col overflow-hidden rounded border border-slate-700 bg-slate-950/96 text-slate-100 shadow-2xl shadow-black/45 backdrop-blur"
            aria-label={zh ? '实时数字孪生控制台' : 'Live digital twin console'}
          >
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 px-3">
              <div className="flex min-w-0 items-center gap-2">
                <RadioTower className="h-4 w-4 text-cyan-200" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{zh ? '实时数字孪生' : 'Live Digital Twin'}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusTone}`} />
                    {connectionState === 'demo' ? (zh ? '合成信号演示' : 'Synthetic signal demo') : connectionState}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded border border-slate-800 text-slate-400 hover:border-cyan-300/60 hover:text-cyan-100"
                onClick={() => setDockOpen(false)}
                title={zh ? '关闭控制台' : 'Close console'}
                aria-label={zh ? '关闭控制台' : 'Close console'}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <nav className="grid shrink-0 grid-cols-4 border-b border-slate-800" aria-label={zh ? '数字孪生视图' : 'Digital twin views'}>
              {tabs.map(([tab, label]) => {
                const Icon = tabIcons[tab];
                return (
                  <button
                    type="button"
                    key={tab}
                    className={`flex h-10 items-center justify-center gap-1.5 border-r border-slate-800 text-[10px] font-semibold last:border-r-0 ${
                      activeTab === tab ? 'bg-cyan-300/10 text-cyan-100' : 'text-slate-500 hover:text-slate-200'
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {activeTab === 'assets' ? <TwinAssetsPanel /> : null}
              {activeTab === 'alarms' ? <TwinAlarmsPanel /> : null}
              {activeTab === 'assistant' ? <TwinAssistantPanel /> : null}
              {activeTab === 'connection' ? <TwinConnectionPanel /> : null}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
