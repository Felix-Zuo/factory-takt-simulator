export function CanvasHalo() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-cyan-300/30 shadow-[0_0_30px_rgba(34,211,238,.5)]" />
      <div className="absolute bottom-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-emerald-300/20 shadow-[0_0_26px_rgba(74,222,128,.38)]" />
    </div>
  );
}
