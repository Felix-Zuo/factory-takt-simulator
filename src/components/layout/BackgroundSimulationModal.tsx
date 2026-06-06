import { Clock3, FileText, Target, X } from 'lucide-react';
import type { SimulationTargetMode } from '../../types/factory';
import { NumberStepper } from '../ui/NumberStepper';

interface BackgroundSimulationModalProps {
  zh: boolean;
  mode: SimulationTargetMode;
  hours: number;
  output: number;
  stepSec: number;
  onPatch: (patch: {
    simulationTargetMode?: SimulationTargetMode;
    simulationTargetHours?: number;
    simulationTargetOutput?: number;
    backgroundStepSec?: number;
  }) => void;
  onRun: () => void;
  onClose: () => void;
}

export function BackgroundSimulationModal({
  zh,
  mode,
  hours,
  output,
  stepSec,
  onPatch,
  onRun,
  onClose,
}: BackgroundSimulationModalProps) {
  return (
    <div className="fixed inset-0 z-[92] grid place-items-center bg-slate-950/60 p-5 backdrop-blur-sm">
      <section className="w-[520px] max-w-[94vw] rounded-lg border border-slate-700 bg-slate-950/98 p-4 shadow-2xl shadow-black/45">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
              <FileText className="h-4 w-4 text-cyan-200" />
              {zh ? '后台仿真报告' : 'Background simulation report'}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {zh
                ? '后台仿真不会播放动画，会直接按目标时间或目标产量计算并生成报告。适合验证一班、一天或指定产量的瓶颈情况。'
                : 'Background simulation skips animation and calculates directly by target time or output, then exports a report.'}
            </p>
          </div>
          <button
            className="grid h-8 w-8 place-items-center rounded border border-slate-700 text-slate-400 hover:border-cyan-300/60 hover:text-cyan-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className={`flex items-center gap-2 rounded border px-3 py-2 text-left text-xs transition ${
              mode === 'time'
                ? 'border-cyan-300 bg-cyan-300/12 text-cyan-100'
                : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500'
            }`}
            onClick={() => onPatch({ simulationTargetMode: 'time' })}
          >
            <Clock3 className="h-4 w-4" />
            <span>{zh ? '按时间仿真' : 'Run by time'}</span>
          </button>
          <button
            className={`flex items-center gap-2 rounded border px-3 py-2 text-left text-xs transition ${
              mode === 'output'
                ? 'border-cyan-300 bg-cyan-300/12 text-cyan-100'
                : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500'
            }`}
            onClick={() => onPatch({ simulationTargetMode: 'output' })}
          >
            <Target className="h-4 w-4" />
            <span>{zh ? '按产量仿真' : 'Run by output'}</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberStepper
            label={zh ? '目标小时' : 'Target hours'}
            value={hours}
            min={0.1}
            max={168}
            step={0.5}
            precision={1}
            onChange={(value) => onPatch({ simulationTargetHours: value })}
          />
          <NumberStepper
            label={zh ? '目标产量' : 'Target output'}
            value={output}
            min={1}
            step={100}
            precision={0}
            onChange={(value) => onPatch({ simulationTargetOutput: value })}
          />
          <NumberStepper
            label={zh ? '计算步长 秒' : 'Step seconds'}
            value={stepSec}
            min={0.1}
            max={5}
            step={0.1}
            precision={1}
            onChange={(value) => onPatch({ backgroundStepSec: value })}
          />
          <div className="rounded border border-slate-800 bg-slate-900/42 px-3 py-2 text-xs leading-relaxed text-slate-400">
            {mode === 'time'
              ? zh
                ? `将仿真 ${hours} 小时后生成报告。`
                : `A report will be generated after simulating ${hours} hours.`
              : zh
                ? `将尽量仿真到 ${output} 件产出后生成报告。`
                : `A report will be generated after reaching about ${output} pcs.`}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 hover:border-slate-500" onClick={onClose}>
            {zh ? '取消' : 'Cancel'}
          </button>
          <button
            className="rounded border border-cyan-300/45 bg-cyan-300/12 px-4 py-2 text-xs font-semibold text-cyan-100 hover:border-cyan-200"
            onClick={onRun}
          >
            {zh ? '开始后台仿真并导出报告' : 'Run and export report'}
          </button>
        </div>
      </section>
    </div>
  );
}
