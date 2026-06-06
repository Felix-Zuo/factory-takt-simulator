import { useReactFlow } from '@xyflow/react';
import { useRef, type PointerEvent } from 'react';
import { useFactoryStore } from '../../store/factoryStore';
import type { FactoryEdge, FactoryNode } from '../../types/factory';

interface EdgeRouteHandleProps {
  edgeId: string;
  x: number;
  y: number;
  color: string;
  routeOffsetX: number;
  routeOffsetY: number;
}

export function EdgeRouteHandle({ edgeId, x, y, color, routeOffsetX, routeOffsetY }: EdgeRouteHandleProps) {
  const selectEdge = useFactoryStore((state) => state.selectEdge);
  const updateEdgeData = useFactoryStore((state) => state.updateEdgeData);
  const reactFlow = useReactFlow<FactoryNode, FactoryEdge>();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    routeOffsetX: number;
    routeOffsetY: number;
  } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    document.body.dataset.routeDragging = '1';
    event.currentTarget.setPointerCapture(event.pointerId);
    selectEdge(edgeId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      routeOffsetX,
      routeOffsetY,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const zoom = reactFlow.getViewport().zoom || 1;
    updateEdgeData(edgeId, {
      routeOffsetX: drag.routeOffsetX + (event.clientX - drag.startX) / zoom,
      routeOffsetY: drag.routeOffsetY + (event.clientY - drag.startY) / zoom,
    });
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    event.preventDefault();
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    window.setTimeout(() => selectEdge(edgeId), 80);
    window.setTimeout(() => {
      delete document.body.dataset.routeDragging;
    }, 220);
  };

  return (
    <button
      type="button"
      className="edge-route-handle nodrag nopan pointer-events-auto absolute"
      title="拖动调整连线方向 / Drag to route"
      style={{
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        borderColor: `${color}99`,
        color,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(event) => {
        event.stopPropagation();
        selectEdge(edgeId);
      }}
    >
      <span />
    </button>
  );
}
