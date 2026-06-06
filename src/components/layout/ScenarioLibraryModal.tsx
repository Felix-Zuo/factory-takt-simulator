import { Save, Trash2, Upload, X } from 'lucide-react';
import type { SavedScenarioSummary } from '../../types/factory';

interface ScenarioLibraryModalProps {
  zh: boolean;
  scenarios: SavedScenarioSummary[];
  scenarioName: string;
  onScenarioNameChange: (value: string) => void;
  onSave: () => void;
  onRefresh: () => void;
  onImport: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ScenarioLibraryModal({
  zh,
  scenarios,
  scenarioName,
  onScenarioNameChange,
  onSave,
  onRefresh,
  onImport,
  onLoad,
  onDelete,
  onClose,
}: ScenarioLibraryModalProps) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/58 p-5 backdrop-blur-sm">
      <section className="w-[640px] max-w-[94vw] rounded-lg border border-slate-700 bg-slate-950/98 p-4 shadow-2xl shadow-black/45">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-50">{zh ? '方案库' : 'Scenario library'}</div>
            <p className="mt-1 text-xs text-slate-500">
              {zh ? '保存多个产线方案，并从列表中选择要加载的版本。' : 'Save multiple layouts and choose exactly which one to load.'}
            </p>
          </div>
          <button
            className="grid h-8 w-8 place-items-center rounded border border-slate-700 text-slate-400 hover:border-cyan-300/60 hover:text-cyan-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={scenarioName}
            onChange={(event) => onScenarioNameChange(event.target.value)}
            placeholder={zh ? '输入方案名称，例如：大沟-大超-甩干示例' : 'Scenario name, e.g. OR-SF-dryer demo'}
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300/70"
          />
          <button
            className="inline-flex items-center gap-2 rounded border border-cyan-300/34 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:border-cyan-300/70"
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
            {zh ? '保存当前' : 'Save current'}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-300/55"
            onClick={onImport}
          >
            <Upload className="h-4 w-4" />
            {zh ? '导入' : 'Import'}
          </button>
        </div>

        <div className="mt-4 max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {scenarios.length === 0 ? (
            <div className="rounded border border-slate-800 bg-slate-900/42 p-4 text-sm text-slate-500">
              {zh ? '还没有保存的方案。先搭建产线，然后点击“保存当前”。' : 'No saved scenarios yet. Build a line, then click Save current.'}
            </div>
          ) : (
            scenarios.map((scenario) => (
              <div key={scenario.id} className="flex items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/50 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-100">{scenario.name}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {new Date(scenario.savedAt).toLocaleString()} · {scenario.nodeCount} nodes · {scenario.edgeCount} links · t=
                    {Math.floor(scenario.elapsedSec)}s
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    className="rounded border border-cyan-300/28 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:border-cyan-300/70"
                    onClick={() => onLoad(scenario.id)}
                  >
                    {zh ? '加载' : 'Load'}
                  </button>
                  <button
                    className="grid h-8 w-8 place-items-center rounded border border-red-400/22 bg-red-500/8 text-red-100 hover:border-red-300/60"
                    onClick={() => onDelete(scenario.id)}
                    title={zh ? '删除方案' : 'Delete scenario'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button className="rounded border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500" onClick={onRefresh}>
            {zh ? '刷新列表' : 'Refresh'}
          </button>
        </div>
      </section>
    </div>
  );
}
