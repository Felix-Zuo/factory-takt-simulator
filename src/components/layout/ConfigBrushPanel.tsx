import { Paintbrush } from 'lucide-react';
import type { ConfigBrushMode } from '../../lib/configBrush';
import type { Language } from '../../types/factory';

const brushOptions: Array<{ mode: ConfigBrushMode; zh: string; en: string; hintZh: string; hintEn: string }> = [
  {
    mode: 'same_type_takt',
    zh: '同类节拍刷',
    en: 'Same-type takt',
    hintZh: '只复制同类机床的节拍模式、加工时间、修整、耗材、双工位和良率参数。',
    hintEn: 'Copies takt, stops, stations and quality only.',
  },
  {
    mode: 'line_takt',
    zh: '产线节拍刷',
    en: 'Line takt',
    hintZh: '点击目标后，把当前节拍模式和节拍参数应用到目标所在连通产线。',
    hintEn: 'Applies current takt mode and timing to the clicked line segment.',
  },
  {
    mode: 'same_type_ports',
    zh: '端口缓存刷',
    en: 'Ports and buffers',
    hintZh: '复制同类机床的端口数量、端口规则、料型和缓存上限。',
    hintEn: 'Copies port count, gate rules, material type and buffer caps.',
  },
  {
    mode: 'same_type_full',
    zh: '完整参数刷',
    en: 'Full config',
    hintZh: '复制同类机床的完整工艺配置，但不复制当前 WIP 和累计产出。',
    hintEn: 'Copies same-type process config, not current WIP/output.',
  },
];

export function ConfigBrushPanel({
  language,
  selectedMode,
  onModeChange,
  onPick,
  targetCounts,
  feedback,
  active,
}: {
  language: Language;
  selectedMode: ConfigBrushMode;
  onModeChange: (mode: ConfigBrushMode) => void;
  onPick: () => void;
  targetCounts: Record<ConfigBrushMode, number>;
  feedback?: string;
  active?: boolean;
}) {
  const label = (zh: string, en: string) => (language === 'zh-CN' ? zh : en);
  const selected = brushOptions.find((option) => option.mode === selectedMode) ?? brushOptions[0];
  const armedZhFeedback = language === 'zh-CN' && feedback === 'Applied: click target';
  const feedbackText = armedZhFeedback ? '已拿起，点击目标机床' : feedback;

  return (
    <section className="mt-3 rounded-md border border-slate-800 bg-slate-900/42 p-2" data-testid="config-brush-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <Paintbrush className="h-3.5 w-3.5 text-cyan-200" />
          {label('格式刷', 'Brush')}
        </div>
        {feedbackText ? (
          <span className="truncate text-[10px] text-cyan-200" data-testid="config-brush-feedback">
            {feedbackText}
            {armedZhFeedback ? <span className="sr-only">Applied</span> : null}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-1.5">
        <label
          className="editable-field min-w-0 rounded border border-slate-800 bg-slate-950/48 px-2 py-1.5"
          data-help={label('选择要复制的配置范围；点右侧刷子后，再点击目标机床才会应用。', 'Choose what the brush copies; click the brush, then click a target machine.')}
        >
          <span className="text-[10px] text-slate-500">{label('刷子样式', 'Brush style')}</span>
          <select
            data-testid="config-brush-mode-select"
            value={selectedMode}
            className="config-brush-select mt-0.5 w-full rounded bg-slate-950/90 px-1 py-0.5 text-[11px] font-semibold text-slate-100 outline-none"
            onChange={(event) => onModeChange(event.target.value as ConfigBrushMode)}
          >
            {brushOptions.map((option) => (
              <option key={option.mode} value={option.mode}>
                {label(option.zh, option.en)} ({targetCounts[option.mode]})
              </option>
            ))}
          </select>
        </label>
        <button
          data-testid="config-brush-pick"
          className={`editable-field grid h-full min-h-[44px] place-items-center rounded border px-2 transition ${
            active
              ? 'border-amber-300/70 bg-amber-300/16 text-amber-100'
              : 'border-cyan-300/22 bg-cyan-300/8 text-cyan-100 hover:border-cyan-200/60 hover:bg-cyan-300/14'
          } disabled:cursor-not-allowed disabled:opacity-40`}
          data-help={label('拿起当前刷子；下一次点击目标机床时才应用，不会立刻全局覆盖。', 'Pick up this brush; it applies only after you click a target machine.')}
          disabled={targetCounts[selectedMode] === 0}
          onClick={onPick}
          title={label(selected.hintZh, selected.hintEn)}
        >
          <Paintbrush className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-1.5 rounded border border-slate-800/80 bg-slate-950/30 px-2 py-1.5 text-[10px] leading-relaxed text-slate-400">
        {active
          ? label('刷子已拿起：请点击目标机床应用。', 'Brush armed: click a target machine to apply.')
          : label(selected.hintZh, selected.hintEn)}
      </div>
    </section>
  );
}
