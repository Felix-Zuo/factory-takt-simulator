import { PanelRightClose } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DeviceParameters, FlowEdgeData } from '../../types/factory';

type ParamKey = keyof DeviceParameters;
type EdgeKey = keyof FlowEdgeData;

interface FieldProps {
  label: string;
  value: string | number | boolean;
  type?: 'text' | 'number' | 'checkbox';
  step?: number;
  min?: number;
  help?: string;
  onChange: (value: string | number | boolean) => void;
}

const defaultFieldHelp = (label: string, type: FieldProps['type']) =>
  type === 'checkbox'
    ? `切换「${label}」后会立即影响当前沙盘配置和后续仿真。`
    : `编辑「${label}」后会立即更新当前对象，并参与节拍、缓存或仿真计算。`;

export function Field({ label, value, type = 'number', step = 1, min, help, onChange }: FieldProps) {
  const fieldHelp = help ?? defaultFieldHelp(label, type);
  if (type === 'checkbox') {
    return (
      <label
        className="editable-field flex items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/52 px-3 py-2 text-xs text-slate-300"
        data-help={fieldHelp}
      >
        <span>{label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-cyan-300"
        />
      </label>
    );
  }

  return (
    <label className="editable-field block rounded border border-slate-800 bg-slate-900/52 px-3 py-2" data-help={fieldHelp}>
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        type={type}
        value={value as string | number}
        min={min}
        step={step}
        onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
        className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-100 outline-none"
      />
    </label>
  );
}

export function NumberField({
  label,
  params,
  paramKey,
  onPatch,
  step,
  min = 0,
  help,
}: {
  label: string;
  params: DeviceParameters;
  paramKey: ParamKey;
  onPatch: (patch: Partial<DeviceParameters>) => void;
  step?: number;
  min?: number;
  help?: string;
}) {
  return (
    <Field
      label={label}
      value={params[paramKey] as number}
      step={step}
      min={min}
      help={help}
      onChange={(value) => onPatch({ [paramKey]: value } as Partial<DeviceParameters>)}
    />
  );
}

export function EdgeNumberField({
  label,
  data,
  edgeKey,
  onPatch,
  step,
  min = 0,
  help,
}: {
  label: string;
  data: FlowEdgeData;
  edgeKey: EdgeKey;
  onPatch: (patch: Partial<FlowEdgeData>) => void;
  step?: number;
  min?: number;
  help?: string;
}) {
  return (
    <Field
      label={label}
      value={data[edgeKey] as number}
      step={step}
      min={min}
      help={help}
      onChange={(value) => onPatch({ [edgeKey]: value } as Partial<FlowEdgeData>)}
    />
  );
}

export function PanelTitle({ icon, title, onCollapse }: { icon: ReactNode; title: string; onCollapse: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-100">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded border border-cyan-300/28 bg-cyan-300/10 text-cyan-100">
          {icon}
        </span>
        {title}
      </div>
      <button
        className="grid h-7 w-7 place-items-center rounded border border-slate-800 text-slate-400 hover:border-cyan-300/50 hover:text-cyan-100"
        onClick={onCollapse}
      >
        <PanelRightClose className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3">
      <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">{title}</div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  );
}
