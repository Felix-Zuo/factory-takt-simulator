import { Code2, HelpCircle, LayoutDashboard, Play } from 'lucide-react';
import { BrandButton } from './BrandButton';

type AppView = 'simulator' | 'settings' | 'tutorial' | 'showcase';

interface ShowcaseHeaderProps {
  setView: (view: AppView) => void;
  zh: boolean;
}

const actionClass =
  'topbar-action inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 rounded border border-slate-700 bg-slate-900/82 px-0 text-[11px] font-medium text-slate-200 transition hover:border-cyan-300/55 hover:text-cyan-100 md:w-auto md:px-2.5';

export function ShowcaseHeader({ setView, zh }: ShowcaseHeaderProps) {
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/96 px-3 py-2 shadow-lg shadow-black/20">
      <BrandButton
        onClick={() => setView('simulator')}
        title="Factory Takt Simulator"
        subtitle={zh ? '通用离散制造节拍仿真产品页' : 'Generic takt simulation product page'}
      />
      <nav className="flex min-w-0 shrink-0 items-center justify-end gap-2" aria-label={zh ? '产品导航' : 'Product navigation'}>
        <button className={`${actionClass} border-cyan-300/70 text-cyan-100`} onClick={() => setView('showcase')} title={zh ? '产品页' : 'Product'} aria-label={zh ? '产品页' : 'Product'}>
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden md:inline">{zh ? '产品页' : 'Product'}</span>
        </button>
        <button className={actionClass} onClick={() => setView('simulator')} title={zh ? '工作台' : 'Workbench'} aria-label={zh ? '工作台' : 'Workbench'}>
          <Play className="h-4 w-4" />
          <span className="hidden md:inline">{zh ? '工作台' : 'Workbench'}</span>
        </button>
        <button className={actionClass} onClick={() => setView('tutorial')} title={zh ? '教程' : 'Tutorial'} aria-label={zh ? '教程' : 'Tutorial'}>
          <HelpCircle className="h-4 w-4" />
          <span className="hidden md:inline">{zh ? '教程' : 'Tutorial'}</span>
        </button>
        <a className={actionClass} href="https://github.com/Felix-Zuo/factory-takt-simulator" rel="noreferrer" target="_blank" title="GitHub" aria-label="GitHub">
          <Code2 className="h-4 w-4" />
          <span className="hidden md:inline">GitHub</span>
        </a>
      </nav>
    </header>
  );
}
