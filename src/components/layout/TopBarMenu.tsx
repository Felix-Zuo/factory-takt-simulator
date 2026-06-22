import type { ReactNode } from 'react';

export function MenuButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs text-slate-200 hover:bg-slate-800" onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 border-t border-slate-800" />;
}
