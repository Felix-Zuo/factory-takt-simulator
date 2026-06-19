import { ChevronRight, GripVertical, PanelLeftClose } from 'lucide-react';
import { useMemo, useState } from 'react';
import { deviceCatalog } from '../../data/deviceCatalog';
import { t } from '../../i18n/text';
import { useFactoryStore } from '../../store/factoryStore';
import type { DeviceType } from '../../types/factory';
import { DeviceIcon } from '../DeviceIcon';

type ModuleTab = 'processing' | 'assembly' | 'logistics';

const deviceTypesByTab: Record<ModuleTab, DeviceType[]> = {
  processing: [
    'material_source',
    'storage_feeder',
    'process_a',
    'finishing',
    'process_b',
    'process_c',
    'finishing_b',
    'general_inspection',
    'spin_dryer',
    'finished_sink',
  ],
  assembly: [
    'merge_buffer',
    'wash_dry',
    'inspection_a',
    'inspection_b',
    'join_station',
    'fasten_station',
    'functional_check',
    'performance_check',
    'fill_station',
    'press_station',
    'visual_inspection',
    'manual_buffer',
    'surface_treatment',
    'spin_dryer',
    'packing_sink',
  ],
  logistics: ['material_source', 'storage_feeder', 'merge_buffer', 'conveyor', 'robot', 'finished_sink', 'packing_sink'],
};

const tabOrder: ModuleTab[] = ['processing', 'assembly', 'logistics'];

export function ModuleLibrary() {
  const [activeTab, setActiveTab] = useState<ModuleTab>('processing');
  const settings = useFactoryStore((state) => state.settings);
  const panels = useFactoryStore((state) => state.panels);
  const collapsed = panels.leftCollapsed;
  const togglePanel = useFactoryStore((state) => state.togglePanel);
  const visibleCatalog = useMemo(
    () =>
      deviceTypesByTab[activeTab]
        .map((type) => deviceCatalog.find((item) => item.type === type))
        .filter(Boolean) as typeof deviceCatalog,
    [activeTab],
  );

  const tabLabel = (tab: ModuleTab) => {
    if (tab === 'assembly') return settings.language === 'zh-CN' ? '后段' : 'Post';
    if (tab === 'logistics') return settings.language === 'zh-CN' ? '物流' : 'Flow';
    return settings.language === 'zh-CN' ? '加工' : 'Proc';
  };

  const onDragStart = (event: React.DragEvent, type: DeviceType) => {
    event.dataTransfer.setData('application/factory-device', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  if (collapsed) {
    return (
      <aside className="flex h-full w-12 shrink-0 flex-col items-center border-r border-slate-800 bg-slate-950/92 py-3">
        <button
          className="grid h-8 w-8 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-300 hover:text-cyan-100"
          onClick={() => togglePanel('leftCollapsed')}
          title={t(settings.language, 'expand')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-slate-800 bg-slate-950/92"
      style={{ width: panels.leftWidth }}
    >
      <div className="border-b border-slate-800 p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">
            {t(settings.language, 'moduleLibrary')}
          </div>
          <button
            className="grid h-7 w-7 place-items-center rounded border border-slate-800 text-slate-400 hover:border-cyan-300/50 hover:text-cyan-100"
            onClick={() => togglePanel('leftCollapsed')}
            title={t(settings.language, 'collapse')}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {settings.language === 'zh-CN' ? '工序分类' : 'Process family'}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 rounded border border-cyan-300/16 bg-slate-950/65 p-1.5">
          {tabOrder.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`truncate rounded px-1.5 py-2 text-xs font-semibold transition ${
                activeTab === tab
                  ? 'border border-cyan-200/42 bg-cyan-300/18 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]'
                  : 'border border-transparent text-slate-500 hover:border-slate-700 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs leading-relaxed text-slate-500">{t(settings.language, 'moduleHint')}</div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {visibleCatalog.map((item) => (
          <div
            key={item.type}
            data-device-type={item.type}
            draggable
            onDragStart={(event) => onDragStart(event, item.type)}
            className="group cursor-grab rounded border border-slate-800/85 bg-slate-900/48 p-2.5 transition hover:border-cyan-300/45 hover:bg-slate-900/72 active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded border"
                style={{
                  borderColor: `${item.accent}55`,
                  background: `linear-gradient(145deg, ${item.accent}18, rgba(15,23,42,.85))`,
                  color: item.accent,
                }}
              >
                <DeviceIcon type={item.type} className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-100">{item.shortName}</div>
                <div className="truncate text-[11px] text-slate-500">
                  {settings.language === 'zh-CN' ? item.zhTitle : item.title}
                </div>
              </div>
              <GripVertical className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-200" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
