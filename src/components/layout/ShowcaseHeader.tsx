import { ExternalLink, HelpCircle, LayoutDashboard, Play } from 'lucide-react';
import { BrandButton } from './BrandButton';

type AppView = 'simulator' | 'settings' | 'tutorial' | 'showcase';

interface ShowcaseHeaderProps {
  setView: (view: AppView) => void;
  zh: boolean;
}

const actionClass =
  'topbar-action inline-flex h-8 shrink-0 items-center gap-1.5 rounded border border-slate-700 bg-slate-900/82 px-2.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-300/55 hover:text-cyan-100';

export function ShowcaseHeader({ setView, zh }: ShowcaseHeaderProps) {
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/96 px-3 py-2 shadow-lg shadow-black/20">
      <BrandButton
        onClick={() => setView('simulator')}
        title="Factory Takt Simulator"
        subtitle={zh ? '通用离散制造节拍仿真产品页' : 'Generic takt simulation product page'}
      />
      <nav className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <button className={`${actionClass} border-cyan-300/70 text-cyan-100`} onClick={() => setView('showcase')}>
          <LayoutDashboard className="h-4 w-4" />
          <span>{zh ? '产品页' : 'Product'}</span>
        </button>
        <button className={actionClass} onClick={() => setView('simulator')}>
          <Play className="h-4 w-4" />
          <span>{zh ? '工作台' : 'Workbench'}</span>
        </button>
        <button className={actionClass} onClick={() => setView('tutorial')}>
          <HelpCircle className="h-4 w-4" />
          <span>{zh ? '教程' : 'Tutorial'}</span>
        </button>
        <a className={actionClass} href="https://github.com/Felix-Zuo/factory-takt-simulator" rel="noreferrer" target="_blank">
          <ExternalLink className="h-4 w-4" />
          <span>GitHub</span>
        </a>
      </nav>
    </header>
  );
}
