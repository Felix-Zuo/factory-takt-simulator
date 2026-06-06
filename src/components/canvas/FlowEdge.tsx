import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { useEffect, useRef } from 'react';
import { calculateEdgeCapacityPerHour, formatNumber } from '../../lib/takt';
import { useFactoryStore } from '../../store/factoryStore';
import type { FactoryEdge } from '../../types/factory';
import { EdgeRouteHandle } from './EdgeRouteHandle';
import { buildManualPath } from './flowEdgePath';

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<FactoryEdge>) {
  const selectEdge = useFactoryStore((state) => state.selectEdge);
  const selectedEdgeId = useFactoryStore((state) => state.selectedEdgeId);
  const animationIntensity = useFactoryStore((state) => state.settings.animationIntensity);
  const hideText = useFactoryStore((state) => state.settings.hideText);
  const isRunning = useFactoryStore((state) => state.isRunning);
  const isActive = selectedEdgeId === id;
  const routeOffsetX = data?.routeOffsetX ?? 0;
  const routeOffsetY = data?.routeOffsetY ?? 0;
  const hasManualRoute = Math.abs(routeOffsetX) > 0.5 || Math.abs(routeOffsetY) > 0.5;
  const pathArgs = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };
  const [edgePath, labelX, labelY] =
    data?.edgeShape === 'orthogonal'
      ? getSmoothStepPath({ ...pathArgs, borderRadius: 4 })
      : getBezierPath(pathArgs);
  const manualRoute = buildManualPath(sourceX, sourceY, targetX, targetY, routeOffsetX, routeOffsetY, data?.edgeShape);
  if (data?.visualHidden) return null;

  const renderPath = data?.visualGroupPath ?? (hasManualRoute ? manualRoute.path : edgePath);
  const routeControlX = data?.visualRouteControlX ?? manualRoute.controlX;
  const routeControlY = data?.visualRouteControlY ?? manualRoute.controlY;
  const renderLabelX = data?.visualGroupLabelX ?? (hasManualRoute ? routeControlX : labelX);
  const renderLabelY = data?.visualGroupLabelY ?? (hasManualRoute ? routeControlY - 16 : labelY - 10);
  const animationOn = animationIntensity === 'standard' || animationIntensity === 'showcase';
  const particleLimit =
    animationIntensity === 'showcase' ? 36 : animationIntensity === 'standard' ? 24 : animationIntensity === 'low' ? 10 : 0;
  const packets = data?.inTransit ?? [];
  const armMoving = data?.transportType === 'loader_arm' && data.armPhase !== 'home';
  const isGroupedArm = Boolean(data?.visualGroupPath);
  const isStopped =
    Boolean(data?.warning?.startsWith('LINE_STOPPED')) ||
    Boolean(data?.warning?.includes('full') || data?.warning?.includes('stopped'));
  const warningColor = data?.warning?.includes('full')
    ? '#ef4444'
    : data?.warning?.startsWith('ARM_WAIT_SPACE')
      ? '#fb923c'
      : '#f59e0b';
  const statusColor = isGroupedArm
    ? isActive
      ? '#c4b5fd'
      : '#8b5cf6'
    : data?.warning
      ? warningColor
      : data?.transportType === 'loader_arm'
        ? '#a855f7'
        : isActive
          ? '#38bdf8'
          : '#22d3ee';
  const edgeShortLabel = isGroupedArm
    ? 'ARM BUS'
    : data?.transportType === 'loader_arm'
      ? 'ARM'
      : data?.transportType === 'conveyor'
        ? 'CV'
      : data?.transportType ?? 'LINK';

  return (
    <>
      <path
        d={renderPath}
        fill="none"
        stroke="transparent"
        strokeWidth={isGroupedArm ? 28 : 22}
        pointerEvents="stroke"
        onClick={(event) => {
          event.stopPropagation();
          selectEdge(id);
        }}
      />
      <BaseEdge
        id={`${id}-depth`}
        className="flow-depth-edge"
        path={renderPath}
        style={{
          stroke: isGroupedArm ? '#1f1438' : '#06111f',
          strokeWidth: isGroupedArm ? 14 : 10,
        }}
      />
      <BaseEdge
        id={`${id}-belt`}
        className="flow-belt-edge"
        path={renderPath}
        style={{
          stroke: isGroupedArm ? '#5b21b6' : data?.transportType === 'loader_arm' ? '#4c1d95' : '#334155',
          strokeWidth: isGroupedArm ? 9 : 7,
          strokeDasharray: '0',
          strokeDashoffset: 0,
        }}
      />
      <BaseEdge
        id={`${id}-glow`}
        className="flow-glow-edge"
        path={renderPath}
        style={{
          stroke: statusColor,
          strokeWidth: isActive ? (isGroupedArm ? 5.5 : 4) : isGroupedArm ? 4 : 2.6,
          opacity: isActive ? 0.16 : 0.08,
          filter: animationOn && isActive ? `drop-shadow(0 0 4px ${statusColor}33)` : undefined,
        }}
      />
      <BaseEdge
        id={`${id}-hit-area`}
        path={renderPath}
        interactionWidth={isGroupedArm ? 34 : 26}
        style={{
          stroke: 'transparent',
          strokeWidth: isGroupedArm ? 24 : 18,
        }}
      />
      <BaseEdge
        id={id}
        className="flow-main-edge"
        path={renderPath}
        markerEnd={markerEnd}
        style={{
          stroke: statusColor,
          strokeWidth: isActive ? (isGroupedArm ? 2.8 : 2.2) : isGroupedArm ? 2 : 1.55,
          strokeDasharray: isGroupedArm ? '0' : data?.transportType === 'loader_arm' ? '10 14' : '0',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      />

      <EdgeLabelRenderer>
        {!hideText ? (
        <div
          className={`edge-label pointer-events-auto absolute flex cursor-pointer items-center gap-1 rounded border border-slate-700/70 bg-slate-950/82 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-100 shadow-lg shadow-black/20 transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
          style={{
            transform: `translate(-50%, -50%) translate(${renderLabelX}px, ${renderLabelY}px)`,
            borderColor: `${statusColor}55`,
            color: statusColor,
          }}
          onClick={(event) => {
            event.stopPropagation();
            selectEdge(id);
          }}
        >
          <span>{edgeShortLabel}</span>
          {isActive ? (
            <>
              <span className="text-slate-500">/</span>
              <span>{formatNumber(data ? calculateEdgeCapacityPerHour(data) : 0, 0)}/h</span>
            </>
          ) : null}
          {isActive && isGroupedArm ? (
            <span className="text-violet-200/90">
              {data?.visualGroupSourceCount ?? 0}-&gt;{data?.visualGroupTargetCount ?? 0}
            </span>
          ) : null}
          {isActive && data?.transportType !== 'loader_arm' ? (
            <span className="text-slate-300/85">
              BUF {data?.lineBufferCount ?? 0}/{data?.lineBufferCapacity ?? 0}
            </span>
          ) : null}
        </div>
        ) : null}

        {isActive ? (
          <EdgeRouteHandle
            edgeId={id}
            x={routeControlX}
            y={routeControlY}
            color={statusColor}
            routeOffsetX={routeOffsetX}
            routeOffsetY={routeOffsetY}
          />
        ) : null}

        {isGroupedArm && data?.visualArmPath ? (
          <div
            className="arm-carrier-dot arm-carrier-dot-grouped pointer-events-none absolute grid h-4 w-7 place-items-center rounded-sm border"
            style={{
              offsetPath: `path("${data.visualArmPath}")`,
              offsetDistance: `${data.visualArmProgress ?? 0}%`,
              offsetAnchor: '50% 50%',
              color: '#ddd6fe',
              transition: animationIntensity === 'showcase' ? 'offset-distance 70ms linear' : 'offset-distance 120ms linear',
            }}
          >
            <span className="h-1 w-4 rounded bg-violet-100" />
            <span
              className={`absolute -bottom-1.5 h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(221,214,254,.75)] ${
                (data.visualArmCarriedQuantity ?? data.carriedQuantity ?? 0) > 0 ? 'bg-emerald-300' : 'bg-violet-200'
              }`}
            />
          </div>
        ) : null}

        {armMoving && data && !isGroupedArm ? (
          <div
            className="arm-carrier-dot pointer-events-none absolute h-3 w-3 rounded"
            style={{
              offsetPath: `path("${renderPath}")`,
              offsetDistance:
                data.armPhase === 'picking'
                  ? `${4 + (1 - data.phaseRemainingSec / Math.max(0.1, data.pickTimeSec)) * 10}%`
                  : data.armPhase === 'moving'
                    ? `${14 + (1 - data.phaseRemainingSec / Math.max(0.1, data.moveTimeSec)) * 66}%`
                    : data.armPhase === 'placing'
                      ? `${80 + (1 - data.phaseRemainingSec / Math.max(0.1, data.placeTimeSec)) * 10}%`
                      : `${90 - (1 - data.phaseRemainingSec / Math.max(0.1, data.returnTimeSec)) * 76}%`,
              transition: animationIntensity === 'showcase' ? 'offset-distance 70ms linear' : 'offset-distance 120ms linear',
            }}
          />
        ) : null}

        {packets.slice(0, particleLimit).map((packet, index) => {
          const size = Math.min(14, 8 + Math.sqrt(Math.max(1, packet.quantity)));
          return (
            <MaterialFlowDot
              key={packet.id}
              packetId={packet.id}
              quantity={packet.quantity}
              remainingSec={packet.remainingSec}
              totalSec={packet.totalSec}
              path={renderPath}
              size={size}
              dimmed={index >= particleLimit - 2}
              isRunning={isRunning}
              isStopped={isStopped}
              animationIntensity={animationIntensity}
            />
          );
        })}
      </EdgeLabelRenderer>
    </>
  );
}

function MaterialFlowDot({
  packetId,
  quantity,
  remainingSec,
  totalSec,
  path,
  size,
  dimmed,
  isRunning,
  isStopped,
  animationIntensity,
}: {
  packetId: string;
  quantity: number;
  remainingSec: number;
  totalSec: number;
  path: string;
  size: number;
  dimmed: boolean;
  isRunning: boolean;
  isStopped: boolean;
  animationIntensity: 'off' | 'low' | 'standard' | 'showcase';
}) {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const initialProgress = Math.min(0.988, Math.max(0.012, 1 - remainingSec / Math.max(0.1, totalSec)));
  const latestProgressRef = useRef(initialProgress);
  const displayedProgressRef = useRef(initialProgress);

  useEffect(() => {
    latestProgressRef.current = Math.min(0.988, Math.max(0.012, 1 - remainingSec / Math.max(0.1, totalSec)));
  }, [remainingSec, totalSec]);

  useEffect(() => {
    const node = dotRef.current;
    if (!node) return undefined;
    let frame = 0;
    const setProgress = (progress: number) => {
      node.style.offsetDistance = `${Math.min(98.8, Math.max(1.2, progress * 100))}%`;
    };

    setProgress(displayedProgressRef.current);
    if (!isRunning || isStopped || animationIntensity === 'off') return undefined;

    const animate = () => {
      const target = latestProgressRef.current;
      const current = displayedProgressRef.current;
      const ease = animationIntensity === 'showcase' ? 0.36 : 0.26;
      const next = Math.abs(target - current) < 0.001 ? target : current + (target - current) * ease;
      displayedProgressRef.current = next;
      setProgress(next);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [animationIntensity, isRunning, isStopped, packetId]);

  return (
    <div
      ref={dotRef}
      className="material-flow-dot pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        offsetPath: `path("${path}")`,
        opacity: dimmed ? 0.68 : 1,
      }}
      data-packet-id={packetId}
      data-quantity={quantity}
    />
  );
}
