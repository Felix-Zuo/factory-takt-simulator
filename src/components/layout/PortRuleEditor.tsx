import { SlidersHorizontal } from 'lucide-react';
import { getPortRule } from '../../lib/portRules';
import type { DeviceParameters, Language, PortRule, SelectedPort } from '../../types/factory';
import { Field, Section } from './parameterPanelParts';

interface PortRuleEditorProps {
  language: Language;
  params: DeviceParameters;
  selectedPort: SelectedPort;
  onPatch: (patch: Partial<PortRule>) => void;
}

const optionLabel = (language: Language, zh: string, en: string) => (language === 'zh-CN' ? zh : en);

function SelectField({
  label,
  value,
  options,
  help,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className="editable-field block rounded border border-slate-800 bg-slate-900/52 px-3 py-2"
      data-help={help ?? `设置「${label}」端口逻辑，改变后会影响机械手和输送线的取放料判断。`}
    >
      <span className="text-[11px] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-slate-950 text-sm font-semibold text-slate-100 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PortRuleEditor({ language, params, selectedPort, onPatch }: PortRuleEditorProps) {
  const rule = getPortRule(params, selectedPort.side, selectedPort.handleId);
  const label = (zh: string, en: string) => optionLabel(language, zh, en);

  return (
    <Section title={label('端口逻辑门', 'Port gate logic')}>
      <div data-testid="port-rule-editor" className="col-span-2 rounded border border-cyan-300/18 bg-cyan-300/8 px-3 py-2 text-xs text-cyan-100">
        <div className="flex items-center gap-2 font-semibold">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {rule.label} · {selectedPort.handleId}
        </div>
        <p className="mt-1 text-cyan-50/70">
          {label(
            '这里控制该输入/输出口的筛选、批量和堵塞策略，类似物流门，不再只是一个连接点。',
            'This controls filter, batch and blocked behavior for this port.',
          )}
        </p>
      </div>
      <Field label={label('启用端口', 'Enabled')} type="checkbox" value={rule.enabled} onChange={(value) => onPatch({ enabled: Boolean(value) })} />
      <Field label={label('端口名称', 'Port label')} type="text" value={rule.label} onChange={(value) => onPatch({ label: String(value) })} />
      <SelectField
        label={label('物料筛选', 'Material filter')}
        value={rule.materialFilter}
        help={label('限定该端口允许通过的大圈、小圈或混合物料，避免产线料型混乱。', 'Limits the material allowed through this port to keep routing clean.')}
        onChange={(value) => onPatch({ materialFilter: value as PortRule['materialFilter'] })}
        options={[
          { value: 'any', label: label('不限', 'Any') },
          { value: 'big_ring', label: label('大圈', 'Big ring') },
          { value: 'small_ring', label: label('小圈', 'Small ring') },
          { value: 'mixed', label: label('混合', 'Mixed') },
        ]}
      />
      <SelectField
        label={label('分配策略', 'Routing')}
        value={rule.routingStrategy}
        help={label('决定多个端口之间如何轮询、跳过堵塞或按低库存优先送料。', 'Controls round-robin, skip-blocked, ratio and low-WIP routing between ports.')}
        onChange={(value) => onPatch({ routingStrategy: value as PortRule['routingStrategy'] })}
        options={[
          { value: 'auto', label: label('自动', 'Auto') },
          { value: 'round_robin', label: label('轮询', 'Round robin') },
          { value: 'force_round_robin', label: label('强制轮询', 'Forced round robin') },
          { value: 'lowest_inventory_first', label: label('优先低库存', 'Lowest WIP first') },
          { value: 'skip_blocked', label: label('堵塞跳过', 'Skip blocked') },
          { value: 'wait_blocked', label: label('堵塞等待', 'Wait blocked') },
          { value: 'ratio', label: label('按比例', 'Ratio') },
          { value: 'material_split', label: label('按物料分类', 'Material split') },
          { value: 'synchronized', label: label('同步输入', 'Synchronized') },
        ]}
      />
      <SelectField
        label={label('堵塞行为', 'Blocked behavior')}
        value={rule.blockedBehavior}
        help={label('下游端口堵塞时，是跳过该口继续找其他口，还是停住等待。', 'When this port is blocked, choose whether to skip it or wait.')}
        onChange={(value) => onPatch({ blockedBehavior: value as PortRule['blockedBehavior'] })}
        options={[
          { value: 'skip_blocked', label: label('跳过堵塞口', 'Skip blocked') },
          { value: 'wait_blocked', label: label('等待堵塞口', 'Wait blocked') },
        ]}
      />
      <Field label={label('最小批量', 'Min batch')} value={rule.minBatch} min={1} onChange={(value) => onPatch({ minBatch: Number(value) })} />
      <Field label={label('最大批量', 'Max batch')} value={rule.maxBatch} min={1} onChange={(value) => onPatch({ maxBatch: Number(value) })} />
      <Field label={label('优先级', 'Priority')} value={rule.priority} min={1} onChange={(value) => onPatch({ priority: Number(value) })} />
      <Field label={label('分配比例', 'Ratio')} value={rule.allocationRatio} min={0} step={0.05} onChange={(value) => onPatch({ allocationRatio: Number(value) })} />
    </Section>
  );
}
