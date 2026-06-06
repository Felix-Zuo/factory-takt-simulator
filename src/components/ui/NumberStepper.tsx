import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  compact?: boolean;
  help?: string;
  onChange: (value: number) => void;
}

export function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  precision,
  compact = false,
  help,
  onChange,
}: NumberStepperProps) {
  const clamp = (next: number) => {
    const lower = min ?? Number.NEGATIVE_INFINITY;
    const upper = max ?? Number.POSITIVE_INFINITY;
    const normalized = Number.isFinite(next) ? next : lower;
    const rounded = precision === undefined ? normalized : Number(normalized.toFixed(precision));
    return Math.min(upper, Math.max(lower, rounded));
  };

  return (
    <label
      className={`editable-field ${compact ? 'min-w-[136px]' : 'block'} rounded border border-slate-800 bg-slate-950/40 px-2.5 py-1.5`}
      data-help={help ?? (label ? `输入或用 +/- 调整「${label}」。` : '输入或用 +/- 调整数值。')}
    >
      {label ? <span className="text-[11px] text-slate-500">{label}</span> : null}
      <div className={label ? 'mt-1 flex items-center gap-1' : 'flex items-center gap-1'}>
        <button
          type="button"
          className="grid h-7 w-7 shrink-0 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-300/60 hover:text-cyan-100"
          onClick={() => onChange(clamp(value - step))}
          aria-label={label ? `${label} minus` : 'minus'}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(clamp(Number(event.target.value)))}
          className="min-w-0 flex-1 bg-transparent text-center text-sm font-semibold text-slate-100 outline-none"
        />
        <button
          type="button"
          className="grid h-7 w-7 shrink-0 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-300/60 hover:text-cyan-100"
          onClick={() => onChange(clamp(value + step))}
          aria-label={label ? `${label} plus` : 'plus'}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </label>
  );
}
