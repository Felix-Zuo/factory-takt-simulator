import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { t } from '../../i18n/text';
import { resolveFlowDirections } from '../../lib/flowDirection';
import { useFactoryStore } from '../../store/factoryStore';
import type { AppSettings, DeviceType, FactoryEdge, FactoryNode, FlowDirection } from '../../types/factory';
import { CanvasContextMenu, type CanvasContextMenuState } from './CanvasContextMenu';
import { CanvasZoomSlider } from './CanvasZoomSlider';
import { DeviceNode } from './DeviceNode';
import { FlowEdge } from './FlowEdge';

const nodeTypes = { deviceNode: DeviceNode };
const edgeTypes = { flowEdge: FlowEdge };
const snapGrid: [number, number] = [24, 24];

// FactoryCanvas owns graph editing gestures. Domain changes are delegated to
// the Zustand store so visual selection, click-to-connect, and drag-to-connect
// stay consistent with the simulation state.
const getArmGroupId = (edge: FactoryEdge) => edge.data?.armGroupId?.trim() || edge.id;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const lerp = (from: number, to: number, progress: number) => from + (to - from) * clamp01(progress);
const phaseProgress = (remainingSec: number | undefined, totalSec: number | undefined) =>
  1 - clamp01((remainingSec ?? 0) / Math.max(0.1, totalSec ?? 0.1));
const pct = (value: number) => Math.max(0, Math.min(100, value * 100));

const nodeFallbackSize = (settings: AppSettings) => ({
  width: settings.hideText ? 58 : settings.cardDensity === 'compact' ? 136 : 154,
  height: settings.hideText ? 52 : settings.cardDensity === 'compact' ? 88 : 104,
});

const nodeSize = (node: FactoryNode, settings: AppSettings) => {
  const fallback = nodeFallbackSize(settings);
  return {
    width: node.measured?.width ?? node.width ?? fallback.width,
    height: node.measured?.height ?? node.height ?? fallback.height,
  };
};

const portRatio = (handleId: string | null | undefined, count: number) => {
  if (count <= 1) return 0.5;
  const index = Math.max(0, Math.min(count - 1, Number(handleId?.split('-')[1] ?? 1) - 1));
  return 0.2 + index * (0.6 / Math.max(1, count - 1));
};

const pointForHandle = (
  node: FactoryNode,
  settings: AppSettings,
  flowDirections: ReadonlyMap<string, FlowDirection>,
  side: 'source' | 'target',
  handleId?: string | null,
) => {
  const size = nodeSize(node, settings);
  const params = node.data.params;
  const count = side === 'source' ? params.outputPortCount ?? 1 : params.inputPortCount ?? 1;
  const flowDirection = flowDirections.get(node.id) ?? 'ltr';
  const connectsOnRight = side === 'source' ? flowDirection === 'ltr' : flowDirection === 'rtl';
  return {
    x: node.position.x + (connectsOnRight ? size.width : 0),
    y: node.position.y + size.height * portRatio(handleId, count),
    id: `${node.id}:${handleId ?? (side === 'source' ? 'out-1' : 'in-1')}`,
    nodeId: node.id,
  };
};

const buildArmGroupVisuals = (
  nodes: FactoryNode[],
  edges: FactoryEdge[],
  settings: AppSettings,
  flowDirections: ReadonlyMap<string, FlowDirection>,
) => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const groups = new Map<string, FactoryEdge[]>();

  edges.forEach((edge) => {
    if (edge.data?.transportType !== 'loader_arm') return;
    const groupId = getArmGroupId(edge);
    groups.set(groupId, [...(groups.get(groupId) ?? []), edge]);
  });

  const visuals = new Map<string, Partial<FactoryEdge['data']>>();

  groups.forEach((groupEdges) => {
    if (groupEdges.length < 2) return;
    const first = groupEdges[0];
    const routeOffsetX = first.data?.routeOffsetX ?? 0;
    const routeOffsetY = first.data?.routeOffsetY ?? 0;
    const sourcePoints = groupEdges
      .map((edge) => {
        const node = nodeMap.get(edge.source);
        return node ? pointForHandle(node, settings, flowDirections, 'source', edge.sourceHandle) : null;
      })
      .filter(Boolean);
    const targetPoints = groupEdges
      .map((edge) => {
        const node = nodeMap.get(edge.target);
        return node ? pointForHandle(node, settings, flowDirections, 'target', edge.targetHandle) : null;
      })
      .filter(Boolean);

    const uniqueSources = [...new Map(sourcePoints.map((point) => [point!.id, point!])).values()];
    const uniqueTargets = [...new Map(targetPoints.map((point) => [point!.id, point!])).values()];
    if (uniqueSources.length === 0 || uniqueTargets.length === 0) return;

    const allPoints = [...uniqueSources, ...uniqueTargets];
    const minX = Math.min(...allPoints.map((point) => point.x)) - 22;
    const maxX = Math.max(...allPoints.map((point) => point.x)) + 22;
    const minY = Math.min(...allPoints.map((point) => point.y));
    const maxY = Math.max(...allPoints.map((point) => point.y));
    const railOffset = settings.hideText ? 44 : 66;
    const railY = (minY - railOffset < 90 ? maxY + railOffset : minY - railOffset) + routeOffsetY;
    const railMinX = minX + Math.min(0, routeOffsetX);
    const railMaxX = maxX + Math.max(0, routeOffsetX);
    const pathParts = [
      `M ${railMinX} ${railY} L ${railMaxX} ${railY}`,
      ...uniqueSources.map((point) => `M ${point.x} ${point.y} L ${point.x} ${railY}`),
      ...uniqueTargets.map((point) => `M ${point.x} ${railY} L ${point.x} ${point.y}`),
    ];
    const activeEdge = groupEdges.find(
      (edge) =>
        edge.data &&
        (edge.data.armPhase !== 'home' || edge.data.phaseRemainingSec > 0 || edge.data.carriedQuantity > 0),
    );
    const activeSource = activeEdge ? nodeMap.get(activeEdge.source) : undefined;
    const activeTarget = activeEdge ? nodeMap.get(activeEdge.target) : undefined;
    const sourcePoint = activeSource
      ? pointForHandle(activeSource, settings, flowDirections, 'source', activeEdge?.sourceHandle)
      : uniqueSources[0];
    const targetPoint = activeTarget
      ? pointForHandle(activeTarget, settings, flowDirections, 'target', activeEdge?.targetHandle)
      : uniqueTargets[0];
    const activeData = activeEdge?.data;
    const sourceVertical = Math.max(1, Math.abs(sourcePoint.y - railY));
    const targetVertical = Math.max(1, Math.abs(targetPoint.y - railY));
    const railTravel = Math.max(1, Math.abs(targetPoint.x - sourcePoint.x));
    const cycleLength = sourceVertical * 2 + targetVertical * 2 + railTravel * 2;
    const pickEnd = sourceVertical / cycleLength;
    const moveEnd = (sourceVertical * 2 + railTravel) / cycleLength;
    const placeEnd = (sourceVertical * 2 + railTravel + targetVertical) / cycleLength;
    const armPath = [
      `M ${sourcePoint.x} ${railY}`,
      `L ${sourcePoint.x} ${sourcePoint.y}`,
      `L ${sourcePoint.x} ${railY}`,
      `L ${targetPoint.x} ${railY}`,
      `L ${targetPoint.x} ${targetPoint.y}`,
      `L ${targetPoint.x} ${railY}`,
      `L ${sourcePoint.x} ${railY}`,
    ].join(' ');
    let visualArmProgress = 0;
    if (activeData?.armPhase === 'picking') {
      const progress = phaseProgress(activeData.phaseRemainingSec, activeData.pickTimeSec);
      visualArmProgress = lerp(0, pickEnd, progress);
    } else if (activeData?.armPhase === 'moving') {
      const progress = phaseProgress(activeData.phaseRemainingSec, activeData.moveTimeSec);
      visualArmProgress = lerp(pickEnd, moveEnd, progress);
    } else if (activeData?.armPhase === 'placing') {
      const progress = phaseProgress(activeData.phaseRemainingSec, activeData.placeTimeSec);
      visualArmProgress = lerp(moveEnd, placeEnd, progress);
    } else if (activeData?.armPhase === 'returning') {
      const progress = phaseProgress(activeData.phaseRemainingSec, activeData.returnTimeSec);
      visualArmProgress = lerp(placeEnd, 1, progress);
    }
    visuals.set(first.id, {
      visualGroupPath: pathParts.join(' '),
      visualGroupLabelX: (railMinX + railMaxX) / 2,
      visualGroupLabelY: railY - 24,
      visualGroupMemberCount: groupEdges.length,
      visualGroupSourceCount: uniqueSources.length,
      visualGroupTargetCount: uniqueTargets.length,
      visualRouteControlX: (railMinX + railMaxX) / 2,
      visualRouteControlY: railY,
      visualArmPath: armPath,
      visualArmProgress: pct(visualArmProgress),
      visualArmPhase: activeData?.armPhase ?? 'home',
      visualArmCarriedQuantity: activeData?.carriedQuantity ?? 0,
    });

    groupEdges.slice(1).forEach((edge) => {
      visuals.set(edge.id, { visualHidden: true });
    });
  });

  return visuals;
};

function FactoryCanvasInner() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<ReactFlowInstance<FactoryNode, FactoryEdge> | null>(null);
  const didInitialFitRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    selectedPort,
    pendingConfigBrush,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addDevice,
    selectNode,
    selectEdge,
    selectPort,
    applyConfigBrushToTarget,
    summary,
    pendingConnectFrom,
    settings,
    updateSettings,
    updateNodeParams,
    updateEdgeData,
    deleteNode,
    deleteEdge,
    undo,
    redo,
  } = useFactoryStore();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/factory-device') as DeviceType;
      if (!type || !flowRef.current) return;

      const rawPosition = flowRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const position = settings.snapToGrid
        ? {
            x: Math.round(rawPosition.x / snapGrid[0]) * snapGrid[0],
            y: Math.round(rawPosition.y / snapGrid[1]) * snapGrid[1],
          }
        : rawPosition;
      addDevice(type, position);
    },
    [addDevice, settings.snapToGrid],
  );

  const fitView = useCallback(() => {
    flowRef.current?.fitView({ padding: 0.18, duration: 240 });
  }, []);

  useEffect(() => {
    if (!nodes.length || !flowRef.current || didInitialFitRef.current) return;
    didInitialFitRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      flowRef.current?.fitView({ padding: 0.16, duration: 180 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [nodes.length]);

  const zoomTo = useCallback((nextZoom: number) => {
    flowRef.current?.zoomTo(nextZoom, { duration: 120 });
    const current = flowRef.current?.getViewport();
    setViewport((value) => ({ ...(current ?? value), zoom: nextZoom }));
  }, []);

  const flowDirections = useMemo(() => resolveFlowDirections(nodes, edges), [edges, nodes]);

  const nodesForFlow: FactoryNode[] = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          resolvedFlowDirection: flowDirections.get(node.id) ?? 'ltr',
        },
      })),
    [flowDirections, nodes, selectedNodeId],
  );

  const edgesWithMarkers: FactoryEdge[] = useMemo(() => {
    const armVisuals = buildArmGroupVisuals(nodes, edges, settings, flowDirections);
    return edges.map((edge) => {
      const data = edge.data
        ? {
            ...edge.data,
            ...(armVisuals.get(edge.id) ?? {}),
          }
        : edge.data;
      const isGroupedArm = Boolean(data?.visualGroupPath);
      return {
        ...edge,
        selected: edge.id === selectedEdgeId,
        markerEnd: isGroupedArm
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: data?.transportType === 'loader_arm' ? '#a855f7' : '#22d3ee',
            },
        data,
      };
    }) as FactoryEdge[];
  }, [edges, flowDirections, nodes, selectedEdgeId, settings]);

  return (
    <div
      ref={wrapperRef}
      data-testid="factory-canvas"
      className="relative h-full w-full overflow-hidden"
      onMouseDownCapture={(event) => {
        if (event.button !== 1) return;
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest('.react-flow__node, .edge-route-handle, .context-menu, .canvas-zoom-slider')) return;
        event.preventDefault();
        fitView();
      }}
    >
      <div className="absolute inset-0 canvas-ambient" />
      {settings.animationIntensity !== 'off' ? <div className="absolute inset-0 industrial-scanline" /> : null}
      {settings.animationIntensity === 'showcase' ? <div className="pointer-events-none absolute inset-0 showcase-energy-grid" /> : null}
      <ReactFlow
        nodes={nodesForFlow}
        edges={edgesWithMarkers}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(instance) => {
          flowRef.current = instance;
          window.setTimeout(() => instance.fitView({ padding: 0.16, duration: 0 }), 80);
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          if (pendingConfigBrush && pendingConfigBrush.sourceNodeId !== node.id) {
            applyConfigBrushToTarget(node.id);
            return;
          }
          selectNode(node.id);
        }}
        onEdgeClick={(_, edge) => selectEdge(edge.id)}
        onMove={(_, nextViewport) => setViewport(nextViewport)}
        onPaneClick={() => {
          if (document.body.dataset.routeDragging === '1') return;
          selectNode(null);
          selectEdge(null);
          if (selectedPort) selectPort(null);
          setContextMenu(null);
        }}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          if (!flowRef.current) return;
          setContextMenu({
            kind: 'pane',
            x: event.clientX,
            y: event.clientY,
            flowPosition: flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
          });
        }}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          selectNode(node.id);
          setContextMenu({ kind: 'node', x: event.clientX, y: event.clientY, nodeId: node.id });
        }}
        onEdgeContextMenu={(event, edge) => {
          event.preventDefault();
          selectEdge(edge.id);
          setContextMenu({ kind: 'edge', x: event.clientX, y: event.clientY, edgeId: edge.id });
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.22}
        maxZoom={1.8}
        snapToGrid={settings.snapToGrid}
        snapGrid={snapGrid}
        connectionLineStyle={{ stroke: '#22d3ee', strokeWidth: 2 }}
        defaultEdgeOptions={{ type: 'flowEdge', markerEnd: { type: MarkerType.ArrowClosed } }}
        panOnScroll
        selectionOnDrag
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        onlyRenderVisibleElements
        className="factory-flow"
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={settings.snapToGrid ? snapGrid[0] : 36}
          size={1}
          color={settings.themeMode === 'light' ? 'rgba(71, 85, 105, 0.24)' : 'rgba(148, 163, 184, 0.14)'}
        />
        <Controls className="!border-slate-700 !bg-slate-950/80 !text-slate-200" />
      </ReactFlow>
      <CanvasZoomSlider
        zoom={viewport.zoom}
        min={0.22}
        max={1.8}
        language={settings.language}
        onZoom={zoomTo}
        onFit={fitView}
      />
      {!settings.hideText ? (
      <div className="pointer-events-none absolute left-4 top-4 rounded border border-cyan-300/16 bg-slate-950/78 px-3 py-2 text-xs text-slate-300 shadow-xl backdrop-blur">
        <div className="font-semibold text-cyan-100">{t(settings.language, 'canvasTitle')}</div>
        <div className="mt-1 text-slate-400">
          {t(settings.language, 'bottleneck')}: <span className="text-amber-200">{summary.bottleneck.label}</span>
        </div>
        {pendingConnectFrom ? (
          <div className="mt-1 text-amber-200">{t(settings.language, 'clickConnectReady')}</div>
        ) : null}
      </div>
      ) : null}
      <CanvasContextMenu
        state={contextMenu}
        nodes={nodes}
        edges={edges}
        language={settings.language}
        snapToGrid={settings.snapToGrid}
        hideText={settings.hideText}
        onClose={() => setContextMenu(null)}
        onAddDevice={(type, position) => addDevice(type, position)}
        onUpdateSettings={updateSettings}
        onUpdateNode={updateNodeParams}
        onUpdateEdge={updateEdgeData}
        onDeleteNode={deleteNode}
        onDeleteEdge={deleteEdge}
        onUndo={undo}
        onRedo={redo}
        onFitView={fitView}
        onZoomReset={() => zoomTo(1)}
      />
    </div>
  );
}

export function FactoryCanvas() {
  return (
    <ReactFlowProvider>
      <FactoryCanvasInner />
    </ReactFlowProvider>
  );
}
