import { Maximize2, Minus, Plus } from 'lucide-react';

interface CanvasZoomSliderProps {
  zoom: number;
  min: number;
  max: number;
  language: string;
  onZoom: (zoom: number) => void;
  onFit: () => void;
}

export function CanvasZoomSlider({ zoom, min, max, language, onZoom, onFit }: CanvasZoomSliderProps) {
  const zh = language === 'zh-CN';
  const roundedZoom = Math.round(zoom * 100);

  return (
    <div className="canvas-zoom-slider nodrag absolute bottom-4 left-16 z-30 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950/84 px-2 py-1.5 text-[10px] text-slate-300 shadow-xl backdrop-blur">
      <button
        className="grid h-6 w-6 place-items-center rounded border border-slate-700 hover:border-cyan-300/60 hover:text-cyan-100"
        title={zh ? '缩小' : 'Zoom out'}
        onClick={() => onZoom(Math.max(min, zoom - 0.1))}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        aria-label={zh ? '画布缩放倍率' : 'Canvas zoom'}
        className="h-1.5 w-32 accent-cyan-300"
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={zoom}
        onChange={(event) => onZoom(Number(event.target.value))}
      />
      <button
        className="grid h-6 w-6 place-items-center rounded border border-slate-700 hover:border-cyan-300/60 hover:text-cyan-100"
        title={zh ? '放大' : 'Zoom in'}
        onClick={() => onZoom(Math.min(max, zoom + 0.1))}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        className="grid h-6 w-6 place-items-center rounded border border-slate-700 hover:border-cyan-300/60 hover:text-cyan-100"
        title={zh ? '适配全部' : 'Fit view'}
        onClick={onFit}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      <span className="w-9 text-right font-semibold text-cyan-100">{roundedZoom}%</span>
    </div>
  );
}
