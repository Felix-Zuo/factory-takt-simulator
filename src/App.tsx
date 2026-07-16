import { lazy, Suspense, useEffect, useState } from 'react';
import { CanvasHalo } from './components/effects/CanvasHalo';
import { BottomTelemetry } from './components/layout/BottomTelemetry';
import { IntroOverlay } from './components/layout/IntroOverlay';
import { ModuleLibrary } from './components/layout/ModuleLibrary';
import { TopBar } from './components/layout/TopBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useIndustrialTwinRuntime } from './hooks/useIndustrialTwinRuntime';
import { useScenarioMemory } from './hooks/useScenarioMemory';
import { installFactoryTaktAgentBridge } from './lib/agentBridge';
import { useFactoryStore } from './store/factoryStore';
import './App.css';

type AppView = 'simulator' | 'settings' | 'tutorial' | 'showcase';
const appViews: AppView[] = ['simulator', 'settings', 'tutorial', 'showcase'];

function getInitialView(): AppView {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get('view') ?? window.location.hash.replace(/^#/, '');
  return appViews.includes(requestedView as AppView) ? (requestedView as AppView) : 'simulator';
}

const TutorialPage = lazy(() =>
  import('./components/layout/TutorialPage').then((module) => ({ default: module.TutorialPage })),
);
const ShowcasePage = lazy(() =>
  import('./components/layout/ShowcasePage').then((module) => ({ default: module.ShowcasePage })),
);
const SettingsPage = lazy(() =>
  import('./components/layout/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const FactoryCanvas = lazy(() =>
  import('./components/canvas/FactoryCanvas').then((module) => ({ default: module.FactoryCanvas })),
);
const ParameterPanel = lazy(() =>
  import('./components/layout/ParameterPanel').then((module) => ({ default: module.ParameterPanel })),
);
const TwinWorkspace = lazy(() =>
  import('./components/industrial/TwinWorkspace').then((module) => ({ default: module.TwinWorkspace })),
);

function App() {
  const initialView = getInitialView();
  const [view, setCurrentView] = useState<AppView>(initialView);
  const [introOpen, setIntroOpen] = useState(initialView === 'simulator');
  useKeyboardShortcuts();
  useIndustrialTwinRuntime();
  useScenarioMemory();
  const tick = useFactoryStore((state) => state.tick);
  const settings = useFactoryStore((state) => state.settings);
  const panels = useFactoryStore((state) => state.panels);
  const setPanelSize = useFactoryStore((state) => state.setPanelSize);
  const createFullLineScenario = useFactoryStore((state) => state.createFullLineScenario);

  const setView = (nextView: AppView) => {
    setCurrentView(nextView);
    const url = new URL(window.location.href);
    if (nextView === 'simulator') {
      url.searchParams.delete('view');
      url.hash = '';
    } else {
      url.searchParams.set('view', nextView);
      url.hash = '';
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  useEffect(() => installFactoryTaktAgentBridge(), []);

  useEffect(() => {
    document.body.dataset.appView = view;
    return () => {
      delete document.body.dataset.appView;
    };
  }, [view]);

  useEffect(() => {
    const tickMs =
      settings.animationIntensity === 'showcase'
        ? 33
        : settings.animationIntensity === 'standard'
          ? 66
          : settings.animationIntensity === 'low'
            ? 120
            : 500;
    const interval = window.setInterval(() => tick(tickMs / 1000), tickMs);
    return () => window.clearInterval(interval);
  }, [settings.animationIntensity, tick]);

  const startPanelResize = (panel: 'leftWidth' | 'rightWidth' | 'bottomHeight') => (event: React.MouseEvent) => {
    event.preventDefault();
    const move = (moveEvent: MouseEvent) => {
      if (panel === 'leftWidth') setPanelSize(panel, moveEvent.clientX);
      if (panel === 'rightWidth') setPanelSize(panel, window.innerWidth - moveEvent.clientX);
      if (panel === 'bottomHeight') setPanelSize(panel, window.innerHeight - moveEvent.clientY);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div
      className={`app-shell view-${view} theme-${settings.themeMode} anim-${settings.animationIntensity} ${
        settings.hideText ? 'text-hidden-mode' : ''
      } flex flex-col bg-slate-950 text-slate-100 ${
        view === 'showcase' ? 'min-h-screen overflow-visible' : 'h-screen min-h-[720px] overflow-hidden'
      }`}
      data-language={settings.language}
    >
      {introOpen ? <IntroOverlay language={settings.language} onClose={() => setIntroOpen(false)} /> : null}
      <TopBar view={view} setView={setView} />
      {view === 'tutorial' ? (
        <Suspense
          fallback={
            <main className="grid h-full place-items-center bg-slate-950 text-sm text-cyan-100">
              Loading tutorial...
            </main>
          }
        >
          <TutorialPage />
        </Suspense>
      ) : view === 'showcase' ? (
        <Suspense
          fallback={
            <main className="grid h-full place-items-center bg-slate-950 text-sm text-cyan-100">
              Loading project overview...
            </main>
          }
        >
          <ShowcasePage
            onLoadTemplate={() => {
              createFullLineScenario();
              setView('simulator');
            }}
            onOpenSimulator={() => setView('simulator')}
          />
        </Suspense>
      ) : view === 'settings' ? (
        <Suspense
          fallback={
            <main className="grid h-full place-items-center bg-slate-950 text-sm text-cyan-100">
              Loading settings...
            </main>
          }
        >
          <SettingsPage />
        </Suspense>
      ) : (
        <div className="flex min-h-0 flex-1">
          <ModuleLibrary />
          {!panels.leftCollapsed ? (
            <div
              className="w-1 cursor-col-resize border-r border-cyan-300/10 bg-transparent hover:bg-cyan-300/20"
              onMouseDown={startPanelResize('leftWidth')}
              title={settings.language === 'zh-CN' ? '拖动调整左侧宽度' : 'Drag to resize left panel'}
            />
          ) : null}
          <main className="relative flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <CanvasHalo />
              <Suspense
                fallback={
                  <div className="grid h-full place-items-center border border-slate-800 bg-slate-950 text-sm text-cyan-100">
                    Loading canvas...
                  </div>
                }
              >
                <FactoryCanvas />
              </Suspense>
              <Suspense fallback={null}>
                <TwinWorkspace />
              </Suspense>
            </div>
            {!panels.bottomCollapsed ? (
              <div
                className="h-1 cursor-row-resize border-t border-cyan-300/10 bg-transparent hover:bg-cyan-300/20"
                onMouseDown={startPanelResize('bottomHeight')}
                title={settings.language === 'zh-CN' ? '拖动调整底部高度' : 'Drag to resize bottom panel'}
              />
            ) : null}
            <BottomTelemetry />
          </main>
          {!panels.rightCollapsed ? (
            <div
              className="w-1 cursor-col-resize border-l border-cyan-300/10 bg-transparent hover:bg-cyan-300/20"
              onMouseDown={startPanelResize('rightWidth')}
              title={settings.language === 'zh-CN' ? '拖动调整右侧宽度' : 'Drag to resize right panel'}
            />
          ) : null}
          <Suspense fallback={null}>
            <ParameterPanel />
          </Suspense>
        </div>
      )}
    </div>
  );
}

export default App;
