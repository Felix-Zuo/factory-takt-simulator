import type { ReactNode } from 'react';
import { cn } from '../../lib/style';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'purple';
}

const toneClass = {
  neutral: 'border-slate-700/70 bg-slate-950/50 text-slate-100',
  good: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  warn: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  bad: 'border-red-400/30 bg-red-500/10 text-red-100',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
  purple: 'border-violet-400/30 bg-violet-400/10 text-violet-100',
};

export function MetricCard({ label, value, hint, tone = 'neutral' }: MetricCardProps) {
  return (
    <div className={cn('rounded-md border px-3 py-2 shadow-inner shadow-black/20', toneClass[tone])}>
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold leading-tight">{value}</div>
      {hint ? <div className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</div> : null}
    </div>
  );
}
