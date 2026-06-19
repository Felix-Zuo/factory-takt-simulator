import {
  ChevronDown,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings,
  Upload,
  WandSparkles,
} from 'lucide-react';
import { lazy, Suspense, useRef, useState, type ChangeEvent } from 'react';
import { t } from '../../i18n/text';
import { useFactoryStore } from '../../store/factoryStore';
import type { SavedScenarioSummary } from '../../types/factory';
import { APP_VERSION } from '../../version';
import { NumberStepper } from '../ui/NumberStepper';

type AppView = 'simulator' | 'settings' | 'tutorial' | 'showcase';

const BackgroundSimulationModal = lazy(() =>
  import('./BackgroundSimulationModal').then((module) => ({ default: module.BackgroundSimulationModal })),
);
const ScenarioLibraryModal = lazy(() =>
  import('./ScenarioLibraryModal').then((module) => ({ default: module.ScenarioLibraryModal })),
);

interface TopBarProps {
  view: AppView;
  setView: (view: AppView) => void;
}

export function TopBar({ view, setView }: TopBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioSummary[]>([]);
  const [scenarioName, setScenarioName] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const {
    isRunning,
    start,
    pause,
    resetSimulation,
    saveScenario,
    listSavedScenarios,
    loadScenario,
    deleteSavedScenario,
    importScenarioJson,
    createDemoScenario,
    createFullLineScenario,
    createAssemblyScenario,
    captureRecord,
    exportScenario,
    exportLatestReport,
    exportRecords,
    runBackgroundSimulation,
    speed,
    setSpeed,
    elapsedSec,
    settings,
    updateSettings,
  } = useFactoryStore();

  const zh = settings.language === 'zh-CN';
  const buttonClass =
    'topbar-action inline-flex h-8 shrink-0 items-center gap-1.5 rounded border border-slate-700 bg-slate-900/82 px-2.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-300/55 hover:text-cyan-100';

  const refreshScenarioList = () => setSavedScenarios(listSavedScenarios());
  const openScenarioModal = () => {
    refreshScenarioList();
    setScenarioModalOpen(true);
  };

  const saveCurrentScenario = () => {
    saveScenario(scenarioName.trim() || undefined);
    setScenarioName('');
    refreshScenarioList();
  };

  const handleImportScenario = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    importScenarioJson(text, file.name.replace(/\.json$/i, ''));
    event.target.value = '';
    refreshScenarioList();
    setScenarioModalOpen(true);
    setMoreOpen(false);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/96 px-3 shadow-lg shadow-black/20">
      <button className="flex min-w-[240px] items-center gap-2 text-left" onClick={() => setView('simulator')}>
        <div className="grid h-9 w-9 place-items-center rounded border border-cyan-300/34 bg-slate-900/70 p-1.5">
          <img src="/brand/brand-mark.svg" alt="Factory Takt Simulator" className="h-full w-full" draggable={false} />
        </div>
        <div>
          <h1 className="flex items-baseline gap-2 text-sm font-semibold tracking-wide text-slate-50">
            <span>Factory_Takt_Simulator</span>
            <span className="text-[10px] font-medium tracking-normal text-slate-500">v{APP_VERSION}</span>
          </h1>
          <p className="max-w-[280px] truncate text-[10px] text-slate-500">
            {zh ? '模块化产线节拍仿真工作台' : 'Modular line takt simulation workstation'}
          </p>
        </div>
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <button className={buttonClass} onClick={start} title={t(settings.language, 'start')}>
          <Play className="h-4 w-4" />
          <span>{t(settings.language, 'start')}</span>
        </button>
        <button className={buttonClass} onClick={pause} title={t(settings.language, 'pause')}>
          <Pause className="h-4 w-4" />
          <span>{t(settings.language, 'pause')}</span>
        </button>
        <button className={buttonClass} onClick={resetSimulation} title={t(settings.language, 'reset')}>
          <RotateCcw className="h-4 w-4" />
          <span>{t(settings.language, 'reset')}</span>
        </button>
        <button className={buttonClass} onClick={openScenarioModal} title={t(settings.language, 'save')}>
          <Save className="h-4 w-4" />
          <span>{t(settings.language, 'save')}</span>
        </button>
        <button className={buttonClass} onClick={openScenarioModal} title={t(settings.language, 'load')}>
          <FolderOpen className="h-4 w-4" />
          <span>{t(settings.language, 'load')}</span>
        </button>
        <button
          className={`${buttonClass} ${view === 'settings' ? 'border-cyan-300/70 text-cyan-100' : ''}`}
          onClick={() => setView('settings')}
          title={t(settings.language, 'settings')}
        >
          <Settings className="h-4 w-4" />
          <span>{t(settings.language, 'settings')}</span>
        </button>
        <button
          className={`${buttonClass} ${settings.snapToGrid ? 'border-cyan-300/70 text-cyan-100' : ''}`}
          onClick={() => updateSettings({ snapToGrid: !settings.snapToGrid })}
          title={zh ? '切换网格对齐 / 自由放置' : 'Toggle grid snap / free placement'}
        >
          <Grid3X3 className="h-4 w-4" />
          <span>{settings.snapToGrid ? (zh ? '网格' : 'Grid') : zh ? '自由' : 'Free'}</span>
        </button>
        <button
          className={`${buttonClass} ${settings.hideText ? 'border-cyan-300/70 text-cyan-100' : ''}`}
          onClick={() => updateSettings({ hideText: !settings.hideText })}
          title={zh ? '隐藏或显示画布文字' : 'Hide or show canvas text'}
        >
          {settings.hideText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{zh ? '文字' : 'Text'}</span>
        </button>
        <div className="relative">
          <button className={buttonClass} onClick={() => setMoreOpen((value) => !value)}>
            <ChevronDown className="h-4 w-4" />
            <span>{t(settings.language, 'more')}</span>
          </button>
          {moreOpen ? (
            <div className="absolute right-0 top-10 z-50 w-60 rounded border border-slate-700 bg-slate-950/98 p-1.5 shadow-2xl shadow-black/40">
              <MenuButton
                icon={<LayoutDashboard className="h-4 w-4" />}
                label={zh ? '项目展示' : 'Project overview'}
                onClick={() => {
                  setView('showcase');
                  setMoreOpen(false);
                }}
              />
              <MenuButton
                icon={<WandSparkles className="h-4 w-4" />}
                label={t(settings.language, 'demo')}
                onClick={() => {
                  createDemoScenario();
                  setMoreOpen(false);
                  setView('simulator');
                }}
              />
              <MenuButton
                icon={<WandSparkles className="h-4 w-4" />}
                label={zh ? '完整产线示例' : 'Full line example'}
                onClick={() => {
                  createFullLineScenario();
                  refreshScenarioList();
                  setMoreOpen(false);
                  setView('simulator');
                }}
              />
              <MenuButton
                icon={<WandSparkles className="h-4 w-4" />}
                label={zh ? '装配线示例' : 'Assembly example'}
                onClick={() => {
                  createAssemblyScenario();
                  refreshScenarioList();
                  setMoreOpen(false);
                  setView('simulator');
                }}
              />
              <MenuDivider />
              <MenuButton
                icon={<FileText className="h-4 w-4" />}
                label={zh ? '后台仿真报告' : 'Background report'}
                onClick={() => {
                  setBackgroundModalOpen(true);
                  setMoreOpen(false);
                }}
              />
              <MenuButton
                icon={<Database className="h-4 w-4" />}
                label={zh ? '记录当前结果' : 'Capture record'}
                onClick={() => {
                  captureRecord();
                  setMoreOpen(false);
                }}
              />
              <MenuButton
                icon={<Download className="h-4 w-4" />}
                label={zh ? '导出报告' : 'Export report'}
                onClick={() => {
                  exportLatestReport();
                  setMoreOpen(false);
                }}
              />
              <MenuButton
                icon={<Download className="h-4 w-4" />}
                label={zh ? '导出方案 JSON' : 'Export scenario JSON'}
                onClick={() => {
                  exportScenario();
                  setMoreOpen(false);
                }}
              />
              <MenuButton
                icon={<Upload className="h-4 w-4" />}
                label={zh ? '导入方案 JSON' : 'Import scenario JSON'}
                onClick={() => importInputRef.current?.click()}
              />
              <MenuButton
                icon={<Download className="h-4 w-4" />}
                label={zh ? '导出记录 CSV' : 'Export records CSV'}
                onClick={() => {
                  exportRecords();
                  setMoreOpen(false);
                }}
              />
              <MenuButton
                icon={<HelpCircle className="h-4 w-4" />}
                label={zh ? '使用教程' : 'Tutorial'}
                onClick={() => {
                  setView('tutorial');
                  setMoreOpen(false);
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="ml-1 flex items-center gap-2 rounded border border-slate-800 bg-slate-900/58 px-2 py-1 text-[11px] text-slate-300">
          <span>{isRunning ? 'RUN' : 'STOP'}</span>
          <input
            aria-label="Simulation speed"
            type="range"
            min={0.5}
            max={200}
            step={speed < 20 ? 0.5 : 5}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="w-24 accent-cyan-300"
          />
          <NumberStepper value={speed} min={0.1} max={500} step={speed < 20 ? 0.5 : 10} precision={1} compact onChange={setSpeed} />
          <span className="w-8 text-cyan-100">{speed}x</span>
          <span className="border-l border-slate-700 pl-2 text-slate-500">t={Math.floor(elapsedSec)}s</span>
        </div>
      </div>

      <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportScenario} />
      {scenarioModalOpen ? (
        <Suspense fallback={null}>
          <ScenarioLibraryModal
            zh={zh}
            scenarios={savedScenarios}
            scenarioName={scenarioName}
            onScenarioNameChange={setScenarioName}
            onSave={saveCurrentScenario}
            onRefresh={refreshScenarioList}
            onImport={() => importInputRef.current?.click()}
            onLoad={(id) => {
              loadScenario(id);
              setScenarioModalOpen(false);
              setView('simulator');
            }}
            onDelete={(id) => {
              deleteSavedScenario(id);
              refreshScenarioList();
            }}
            onClose={() => setScenarioModalOpen(false)}
          />
        </Suspense>
      ) : null}
      {backgroundModalOpen ? (
        <Suspense fallback={null}>
          <BackgroundSimulationModal
            zh={zh}
            mode={settings.simulationTargetMode}
            hours={settings.simulationTargetHours}
            output={settings.simulationTargetOutput}
            stepSec={settings.backgroundStepSec}
            onPatch={updateSettings}
            onRun={() => {
              runBackgroundSimulation();
              setBackgroundModalOpen(false);
            }}
            onClose={() => setBackgroundModalOpen(false)}
          />
        </Suspense>
      ) : null}
    </header>
  );
}

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs text-slate-200 hover:bg-slate-800" onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-slate-800" />;
}
