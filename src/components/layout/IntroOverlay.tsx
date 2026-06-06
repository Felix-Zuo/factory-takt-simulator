import { useEffect } from 'react';

export function IntroOverlay({ language, onClose }: { language: string; onClose: () => void }) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('keydown', close, { once: true });
    window.addEventListener('pointerdown', close, { once: true });
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('pointerdown', close);
    };
  }, [onClose]);

  const zh = language === 'zh-CN';
  return (
    <button
      className="intro-overlay fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-slate-950 text-left text-slate-100"
      onClick={onClose}
      aria-label="Enter simulator"
      autoFocus
    >
      <div className="absolute inset-0 industrial-grid opacity-45" />
      <div className="absolute inset-0 intro-depth-grid" />
      <div className="intro-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-cyan-200/6" />
      <div className="intro-card relative w-[860px] max-w-[90vw] overflow-hidden rounded-lg border border-cyan-300/18 bg-slate-950/82 p-7 shadow-2xl shadow-black/45">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
        <div className="flex items-center gap-5">
          <div className="intro-mark grid h-24 w-24 shrink-0 place-items-center rounded-lg border border-cyan-300/22 bg-slate-900/70 p-3 shadow-[0_0_28px_rgba(34,211,238,.12)]">
            <img src="/brand/brand-mark.svg" alt="Factory Takt brand mark" className="h-full w-full" draggable={false} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="intro-brand-lockup">
              <div className="intro-cu">FTS</div>
              <div className="min-w-0">
                <div className="intro-cn">{zh ? '产线节拍仿真' : 'Line Takt Simulation'}</div>
                <div className="intro-en">{zh ? 'Factory Takt Simulator' : 'Discrete manufacturing sandbox'}</div>
              </div>
            </div>
            <div className="mt-5 text-3xl font-semibold tracking-tight text-slate-50">Factory_Takt_Simulator</div>
            <div className="mt-1 text-sm uppercase tracking-[0.22em] text-cyan-100">
              {zh ? '模块化离散制造产线沙盘' : 'Generic Line Takt Sandbox'}
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
          <span className="rounded border border-slate-800/85 bg-slate-900/42 px-3 py-2">
            {zh ? '自动恢复最近方案' : 'Auto recovery'}
          </span>
          <span className="rounded border border-slate-800/85 bg-slate-900/42 px-3 py-2">
            {zh ? '工序与物流同步建模' : 'Process and transfer modeling'}
          </span>
          <span className="rounded border border-slate-800/85 bg-slate-900/42 px-3 py-2">
            {zh ? '点击或按任意键进入' : 'Click or press any key'}
          </span>
        </div>
      </div>
    </button>
  );
}
