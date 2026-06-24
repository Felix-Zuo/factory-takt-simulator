import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { getCatalogItem, statusColorMap, statusLabels } from '../../data/deviceCatalog';
import { getPortRule } from '../../lib/portRules';
import { calculateStationTakts, formatNumber } from '../../lib/takt';
import { useFactoryStore } from '../../store/factoryStore';
import type { FactoryNode } from '../../types/factory';
import { DeviceIcon } from '../DeviceIcon';

export function DeviceNode({ id, data, selected }: NodeProps<FactoryNode>) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { params, runtime, metrics } = data;
  const catalog = getCatalogItem(params.deviceType);
  const color = statusColorMap[runtime.status];
  const language = useFactoryStore((state) => state.settings.language);
  const themeMode = useFactoryStore((state) => state.settings.themeMode);
  const density = useFactoryStore((state) => state.settings.cardDensity);
  const hideText = useFactoryStore((state) => state.settings.hideText);
  const animationIntensity = useFactoryStore((state) => state.settings.animationIntensity);
  const pendingConnectFrom = useFactoryStore((state) => state.pendingConnectFrom);
  const pendingConfigBrush = useFactoryStore((state) => state.pendingConfigBrush);
  const selectedPort = useFactoryStore((state) => state.selectedPort);
  const beginClickConnect = useFactoryStore((state) => state.beginClickConnect);
  const completeClickConnect = useFactoryStore((state) => state.completeClickConnect);
  const selectPort = useFactoryStore((state) => state.selectPort);
  const deleteNode = useFactoryStore((state) => state.deleteNode);
  const status = statusLabels[runtime.status];
  const stationTakts = calculateStationTakts(params);
  const isClickSource = pendingConnectFrom?.nodeId === id;
  const isBrushSource = pendingConfigBrush?.sourceNodeId === id;
  const isBrushTarget = Boolean(pendingConfigBrush && pendingConfigBrush.sourceNodeId !== id);
  const compact = density === 'compact';
  const lightMode = themeMode === 'light';
  const requestedInputPorts = Math.max(1, Math.min(4, params.inputPortCount ?? 1));
  const requestedOutputPorts = Math.max(1, Math.min(4, params.outputPortCount ?? 1));
  const inputPorts =
    params.deviceType === 'material_source'
      ? []
      : Array.from({ length: requestedInputPorts }, (_, index) => `in-${index + 1}`);
  const outputPorts =
    params.deviceType === 'finished_sink' || params.deviceType === 'packing_sink'
      ? []
      : Array.from({ length: requestedOutputPorts }, (_, index) => `out-${index + 1}`);
  const animateNode = animationIntensity !== 'off' && animationIntensity !== 'low';
  const cycleSec =
    params.deviceType === 'spin_dryer'
      ? params.dryerDryTimeSec
      : params.deviceType === 'wash_dry'
        ? params.cleanerPushIntervalSec
        : params.deviceType === 'material_source' || params.deviceType === 'storage_feeder' || params.deviceType === 'merge_buffer'
          ? params.feedIntervalSec
          : params.processTimeSec;
  const cycleProgress =
    runtime.status === 'running'
      ? Math.max(0, Math.min(1, 1 - runtime.processRemainingSec / Math.max(0.1, cycleSec)))
      : runtime.pendingOutput > 0
        ? 1
        : 0;
  const internalCount =
    params.deviceType === 'spin_dryer'
      ? (params.dryerLoadedColumns + params.dryerDriedColumns) * params.dryerColumnBatchSize
      : params.deviceType === 'merge_buffer'
        ? params.partAStorageCount + params.partBStorageCount
        : params.deviceType === 'wash_dry'
          ? params.cleanerInternalCount + params.cleanerReadyCount + runtime.cleanerOutputQueue
          : runtime.pendingOutput + (runtime.status === 'running' ? params.batchSize : 0);
  const internalCapacity =
    params.deviceType === 'spin_dryer'
      ? Math.max(1, params.dryerColumnBatchSize * params.dryerColumnCount)
      : params.deviceType === 'merge_buffer'
        ? Math.max(1, params.partAStorageCapacity + params.partBStorageCapacity)
        : params.deviceType === 'wash_dry'
          ? Math.max(1, params.cleanerLaneCapacity * params.cleanerLaneCount + params.cleanerAirBatchSize)
          : Math.max(1, params.batchSize + runtime.pendingOutput);
  const internalRatio = Math.max(0, Math.min(1, internalCount / internalCapacity));
  const portTop = (count: number, index: number) => (count > 1 ? `${20 + index * (60 / (count - 1))}%` : '50%');
  const portRule = (kind: 'in' | 'out', handleId: string) =>
    getPortRule(params, kind === 'out' ? 'output' : 'input', handleId);
  const portAccent = (kind: 'in' | 'out', handleId: string) => {
    const rule = portRule(kind, handleId);
    if (!rule.enabled) return '#64748b';
    if (rule.materialFilter === 'part_a') return '#38bdf8';
    if (rule.materialFilter === 'part_b') return '#a78bfa';
    if (rule.materialFilter === 'mixed') return '#22c55e';
    return kind === 'out' ? '#06b6d4' : '#f59e0b';
  };
  const portBadge = (kind: 'in' | 'out', handleId: string, fallback: number) => {
    const rule = portRule(kind, handleId);
    if (!rule.enabled) return 'X';
    if (rule.materialFilter === 'part_a') return 'A';
    if (rule.materialFilter === 'part_b') return 'B';
    if (rule.materialFilter === 'mixed') return 'M';
    if (rule.routingStrategy === 'force_round_robin') return 'R';
    if (rule.routingStrategy === 'lowest_inventory_first') return 'L';
    return String(fallback);
  };
  const finishingMode = params.processFamily === 'finishing' ? params.finishingMode : null;
  const station1Cycle = Math.max(0.1, params.firstPassProcessTimeSec || params.station1ProcessTimeSec || params.processTimeSec);
  const station2Cycle = Math.max(0.1, params.secondPassProcessTimeSec || params.station2ProcessTimeSec || params.processTimeSec);
  const station1Progress =
    runtime.station1ProcessRemainingSec > 0 ? 1 - runtime.station1ProcessRemainingSec / station1Cycle : runtime.station1PendingOutput > 0 ? 1 : 0;
  const station2Progress =
    runtime.station2ProcessRemainingSec > 0 ? 1 - runtime.station2ProcessRemainingSec / station2Cycle : runtime.station2PendingOutput > 0 ? 1 : 0;
  const isInspectionFamily = params.processFamily === 'inspection';
  const isAssemblyFamily =
    params.processFamily === 'assembly' ||
    params.processFamily === 'cleaning' ||
    params.processFamily === 'buffer' ||
    params.processFamily === 'sink';
  const compactCardWidth = isInspectionFamily ? 'w-[124px]' : isAssemblyFamily ? 'w-[128px]' : 'w-[136px]';
  const standardCardWidth = isInspectionFamily ? 'w-[134px]' : isAssemblyFamily ? 'w-[138px]' : 'w-[154px]';
  const cardWidth = hideText ? 'w-[58px]' : compact ? compactCardWidth : standardCardWidth;

  const handlePortClick = (event: React.MouseEvent, kind: 'in' | 'out', handleId: string) => {
    event.stopPropagation();
    selectPort({ nodeId: id, side: kind === 'out' ? 'output' : 'input', handleId });
    if (kind === 'out') beginClickConnect(id, handleId);
    else completeClickConnect(id, handleId);
  };

  const zh = language === 'zh-CN';

  return (
    <motion.div
      title={`${catalog.zhTitle} / ${catalog.title}`}
      data-node-short-name={params.deviceShortName}
      className={`${cardWidth} node-card group relative overflow-visible rounded border bg-slate-950/96 text-slate-100 shadow-lg shadow-black/20 ${isBrushSource ? 'node-brush-source' : ''} ${isBrushTarget ? 'node-brush-target' : ''} ${isDeleting ? 'node-card-deleting' : ''}`}
      style={{
        borderColor: selected || isClickSource || isBrushSource ? color : `${color}55`,
        boxShadow:
          selected || isClickSource || isBrushSource
            ? `0 0 0 1px ${color}, 0 10px 26px rgba(2,6,23,.28)`
            : runtime.status === 'running'
              ? '0 10px 22px rgba(2,6,23,.24)'
              : undefined,
      }}
      initial={animateNode ? { opacity: 0, y: 8, scale: 0.98 } : false}
      animate={animateNode ? { opacity: 1, y: 0, scale: selected ? 1.01 : 1 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      {inputPorts.map((handleId, index) => (
        <div key={handleId}>
          <Handle
            id={handleId}
            type="target"
            position={Position.Left}
            data-port-kind="in"
            className={`node-port node-port-in !h-4 !w-3.5 !rounded-[3px] !border ${
              selectedPort?.nodeId === id && selectedPort.handleId === handleId ? 'node-port-selected' : ''
            }`}
            title={zh ? `输入工位 ${index + 1}` : `Input station ${index + 1}`}
            style={{
              background: pendingConnectFrom ? 'rgba(250,204,21,.58)' : `${portAccent('in', handleId)}7a`,
              color: portAccent('in', handleId),
              top: portTop(inputPorts.length, index),
              opacity: portRule('in', handleId).enabled ? 1 : 0.38,
            }}
            onMouseDownCapture={(event) => handlePortClick(event, 'in', handleId)}
            onClickCapture={(event) => event.stopPropagation()}
            isConnectable
            isValidConnection={() => true}
          />
          <span
            className="node-port-label node-port-label-in nodrag"
            role="button"
            tabIndex={0}
            title={zh ? `点击编辑输入口 ${index + 1}` : `Edit input port ${index + 1}`}
            style={{ top: portTop(inputPorts.length, index) }}
            onMouseDown={(event) => handlePortClick(event, 'in', handleId)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') handlePortClick(event as unknown as React.MouseEvent, 'in', handleId);
            }}
          >
            {portBadge('in', handleId, index + 1)}
          </span>
        </div>
      ))}

      {outputPorts.map((handleId, index) => (
        <div key={handleId}>
          <Handle
            id={handleId}
            type="source"
            position={Position.Right}
            data-port-kind="out"
            className={`node-port node-port-out !h-4 !w-3.5 !rounded-[3px] !border ${
              selectedPort?.nodeId === id && selectedPort.handleId === handleId ? 'node-port-selected' : ''
            }`}
            title={zh ? `输出工位 ${index + 1}` : `Output station ${index + 1}`}
            style={{
              background: `${portAccent('out', handleId)}7a`,
              color: portAccent('out', handleId),
              top: portTop(outputPorts.length, index),
              opacity: portRule('out', handleId).enabled ? 1 : 0.38,
            }}
            onMouseDownCapture={(event) => handlePortClick(event, 'out', handleId)}
            onClickCapture={(event) => event.stopPropagation()}
            isConnectable
          />
          <span
            className="node-port-label node-port-label-out nodrag"
            role="button"
            tabIndex={0}
            title={zh ? `点击编辑输出口 ${index + 1}` : `Edit output port ${index + 1}`}
            style={{ top: portTop(outputPorts.length, index) }}
            onMouseDown={(event) => handlePortClick(event, 'out', handleId)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') handlePortClick(event as unknown as React.MouseEvent, 'out', handleId);
            }}
          >
            {portBadge('out', handleId, index + 1)}
          </span>
        </div>
      ))}

      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: color }} />
      <button
        className="nodrag absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded border border-slate-700/70 bg-slate-950/80 text-slate-500 opacity-0 transition hover:border-red-300/60 hover:text-red-200 group-hover:opacity-100"
        title={zh ? '删除工序' : 'Delete process'}
        onClick={(event) => {
          event.stopPropagation();
          if (isDeleting) return;
          setIsDeleting(true);
          window.setTimeout(() => deleteNode(id), 180);
        }}
      >
        <Trash2 className="h-3 w-3" />
      </button>

      <div className={hideText ? 'node-card-body relative grid place-items-center p-2' : 'node-card-body relative p-2'}>
        <div className={hideText ? 'grid place-items-center' : 'grid grid-cols-[30px_minmax(0,1fr)] items-center gap-2'}>
          <div
            className={`${hideText ? 'h-9 w-9' : 'h-7 w-7'} node-icon-shell grid shrink-0 place-items-center rounded border`}
            style={{
              borderColor: `${catalog.accent}55`,
              background: lightMode
                ? `linear-gradient(145deg, ${catalog.accent}18, rgba(255,255,255,.96))`
                : `linear-gradient(145deg, ${catalog.accent}18, rgba(15,23,42,.92))`,
              color: catalog.accent,
            }}
          >
            <DeviceIcon type={params.deviceType} className={hideText ? 'h-6 w-6' : 'h-5 w-5'} />
          </div>
          {!hideText ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-bold leading-tight">{params.deviceShortName}</div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}88` }}
                />
                <span className="truncate text-[10px] font-semibold uppercase" style={{ color }}>
                  {zh ? status.zh : status.short}
                </span>
              </div>
            </div>
          ) : (
            <span
              className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}88` }}
            />
          )}
        </div>

        {!hideText ? (
          <div className="mt-1.5 space-y-0.5 text-[10px] leading-tight text-slate-300">
            <div className="truncate">
              {zh ? '总节拍' : 'Takt'}{' '}
              <span className="font-semibold text-slate-50">{formatNumber(metrics.averageSinglePieceTakt, 2)}s</span>
            </div>
            {params.station2Enabled && params.deviceType !== 'material_source' && params.deviceType !== 'finished_sink' ? (
              <div className="whitespace-nowrap text-[10px] text-slate-400">
                S1 {formatNumber(stationTakts.station1Takt, 1)}s <span className="text-slate-600">|</span> S2{' '}
                {formatNumber(stationTakts.station2Takt, 1)}s
              </div>
            ) : null}
            {params.deviceType === 'material_source' ? (
              <div className="truncate">
                {zh ? '源' : 'SRC'} ∞ <span className="text-slate-600">|</span> {zh ? '出' : 'OUT'} {params.outputBufferCount}/
                {params.outputBufferCapacity}
              </div>
            ) : params.deviceType === 'finished_sink' || params.deviceType === 'packing_sink' ? (
              <div className="truncate">
                {zh ? '入' : 'IN'} {params.inputBufferCount}/∞ <span className="text-slate-600">|</span>{' '}
                {zh ? '成品' : 'FIN'} {metrics.totalOutput}
              </div>
            ) : params.deviceType === 'merge_buffer' ? (
              <div className="truncate">
                A {params.partAStorageCount}/{params.partAStorageCapacity} <span className="text-slate-600">|</span> B{' '}
                {params.partBStorageCount}/{params.partBStorageCapacity}
              </div>
            ) : params.deviceType === 'wash_dry' ? (
              <div className="truncate">
                MID {params.cleanerInternalCount}/{params.cleanerLaneCapacity * params.cleanerLaneCount}{' '}
                <span className="text-slate-600">|</span> AIR {params.cleanerReadyCount}/{params.cleanerAirBatchSize}
              </div>
            ) : (
              <div className="truncate">
                {zh ? '入' : 'IN'} {params.inputBufferCount}/{params.inputBufferCapacity} <span className="text-slate-600">|</span>{' '}
                {zh ? '出' : 'OUT'} {params.outputBufferCount}/{params.outputBufferCapacity}
              </div>
            )}
            <div>
              {zh ? '产出' : 'Out'} <span className="font-semibold text-slate-50">{metrics.totalOutput}</span>
            </div>
            <div className="node-mini-bars pt-1">
              <div className="node-progress-row" title={zh ? '本轮作料进度' : 'Current cycle progress'}>
                <span>{zh ? '作料' : 'Cycle'}</span>
                <div className="node-process-bar">
                  <i style={{ width: `${cycleProgress * 100}%`, backgroundColor: color }} />
                </div>
                <b>{Math.round(cycleProgress * 100)}%</b>
              </div>
              <div className="node-progress-row" title={zh ? '机器内部料量' : 'Material inside machine'}>
                <span>{zh ? '机内' : 'MID'}</span>
                <div className="node-wip-bar">
                  <i style={{ width: `${internalRatio * 100}%` }} />
                </div>
                <b>
                  {internalCount}/{internalCapacity}
                </b>
              </div>
            </div>
            {finishingMode ? (
              <div
                className={`sf-station-strip ${finishingMode === 'single_station_once' ? 'sf-station-strip-single' : ''} ${
                  finishingMode === 'serial_twice' ? 'sf-station-strip-serial' : ''
                }`}
              >
                <div className="sf-station">
                  <span>S1</span>
                  <i style={{ width: `${Math.max(0, Math.min(1, station1Progress)) * 100}%` }} />
                  <b>
                    {params.station1InputBufferCount}/{params.station1InputBufferCapacity}
                  </b>
                </div>
                {finishingMode !== 'single_station_once' ? (
                  <>
                    <em>{finishingMode === 'serial_twice' ? '>' : '||'}</em>
                    <div className="sf-station">
                      <span>S2</span>
                      <i style={{ width: `${Math.max(0, Math.min(1, station2Progress)) * 100}%` }} />
                      <b>
                        {params.station2InputBufferCount}/{params.station2InputBufferCapacity}
                      </b>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="node-mini-bars node-mini-bars-hidden">
            <div className="node-process-bar">
              <i style={{ width: `${cycleProgress * 100}%`, backgroundColor: color }} />
            </div>
            <div className="node-wip-bar">
              <i style={{ width: `${internalRatio * 100}%` }} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
