import { APP_VERSION } from '../../version';

const brandMarkUrl = `${import.meta.env.BASE_URL}brand/brand-mark.svg`;

interface BrandButtonProps {
  onClick: () => void;
  subtitle: string;
  title: string;
}

export function BrandButton({ onClick, subtitle, title }: BrandButtonProps) {
  return (
    <button className="flex min-w-[188px] items-center gap-2 text-left sm:min-w-[240px]" onClick={onClick}>
      <div className="grid h-9 w-9 place-items-center rounded border border-cyan-300/34 bg-slate-900/70 p-1.5">
        <img src={brandMarkUrl} alt="Factory Takt Simulator" className="h-full w-full" draggable={false} />
      </div>
      <div>
        <h1 className="flex items-baseline gap-2 text-sm font-semibold text-slate-50">
          <span>{title}</span>
          <span className="hidden text-[10px] font-medium text-slate-500 min-[480px]:inline">v{APP_VERSION}</span>
        </h1>
        <p className="hidden max-w-[320px] truncate text-[10px] text-slate-500 sm:block">{subtitle}</p>
      </div>
    </button>
  );
}
