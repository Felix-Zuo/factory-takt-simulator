import { APP_VERSION } from '../../version';

const brandMarkUrl = `${import.meta.env.BASE_URL}brand/brand-mark.svg`;

interface BrandButtonProps {
  onClick: () => void;
  subtitle: string;
  title: string;
}

export function BrandButton({ onClick, subtitle, title }: BrandButtonProps) {
  return (
    <button className="flex min-w-[240px] items-center gap-2 text-left" onClick={onClick}>
      <div className="grid h-9 w-9 place-items-center rounded border border-cyan-300/34 bg-slate-900/70 p-1.5">
        <img src={brandMarkUrl} alt="Factory Takt Simulator" className="h-full w-full" draggable={false} />
      </div>
      <div>
        <h1 className="flex items-baseline gap-2 text-sm font-semibold text-slate-50">
          <span>{title}</span>
          <span className="text-[10px] font-medium text-slate-500">v{APP_VERSION}</span>
        </h1>
        <p className="max-w-[320px] truncate text-[10px] text-slate-500">{subtitle}</p>
      </div>
    </button>
  );
}
