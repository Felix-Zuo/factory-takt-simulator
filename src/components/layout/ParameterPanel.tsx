import { AlertTriangle, Cable, ChevronLeft, Power, Settings2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { statusLabels } from '../../data/deviceCatalog';
import { t } from '../../i18n/text';
import {
  calculateEdgeCapacityPerHour,
  formatNumber,
  getEdgeCycleTime,
} from '../../lib/takt';
import { getConfigBrushTargetCount, type ConfigBrushMode } from '../../lib/configBrush';
import { supportsTaktSettings } from '../../lib/taktSettingsSupport';
import { useFactoryStore } from '../../store/factoryStore';
import type { DeviceParameters, EdgeShape, FlowEdgeData, TransportType } from '../../types/factory';
import { MetricCard } from '../ui/MetricCard';
import { ConfigBrushPanel } from './ConfigBrushPanel';
import { EdgeNumberField, Field, NumberField, PanelTitle, Section } from './parameterPanelParts';
import { PortRuleEditor } from './PortRuleEditor';
import { TaktSettingsPanel } from './TaktSettingsPanel';

export function ParameterPanel() {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    selectedPort,
    pendingConfigBrush,
    updateNodeParams,
    updatePortRule,
    updateEdgeData,
    startConfigBrush,
    deleteNode,
    deleteEdge,
    summary,
    settings,
    panels,
    togglePanel,
  } = useFactoryStore();
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const label = (zh: string, en: string) => (settings.language === 'zh-CN' ? zh : en);
  const [brushMode, setBrushMode] = useState<ConfigBrushMode>('same_type_takt');
  const [brushFeedback, setBrushFeedback] = useState('');

  const ranking = useMemo(
    () =>
      [...nodes]
        .filter((node) => node.data.params.enabled)
        .sort(
          (a, b) =>
            b.data.metrics.totalWaitingTime +
            b.data.metrics.totalBlockedTime -
            (a.data.metrics.totalWaitingTime + a.data.metrics.totalBlockedTime),
        )
        .slice(0, 4),
    [nodes],
  );

  if (panels.rightCollapsed) {
    return (
      <aside className="flex h-full w-12 shrink-0 flex-col items-center border-l border-slate-800 bg-slate-950/92 py-3">
        <button
          className="grid h-8 w-8 place-items-center rounded border border-slate-700 text-slate-300 hover:border-cyan-300 hover:text-cyan-100"
          onClick={() => togglePanel('rightCollapsed')}
          title={t(settings.language, 'expand')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  if (selectedEdge?.data) {
    const edgeData = selectedEdge.data;
    const onPatch = (patch: Partial<FlowEdgeData>) => updateEdgeData(selectedEdge.id, patch);
    const armGroupId = edgeData.transportType === 'loader_arm' ? edgeData.armGroupId?.trim() : '';
    const armGroupEdges = armGroupId
      ? edges.filter((edge) => edge.data?.transportType === 'loader_arm' && edge.data.armGroupId?.trim() === armGroupId)
      : [];
    const armGroupSources = new Set(armGroupEdges.map((edge) => edge.source)).size;
    const armGroupTargets = new Set(armGroupEdges.map((edge) => edge.target)).size;

    return (
      <aside className="h-full shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-950/94 p-3" style={{ width: panels.rightWidth }}>
        <PanelTitle icon={<Cable className="h-4 w-4" />} title={t(settings.language, 'edgeParameters')} onCollapse={() => togglePanel('rightCollapsed')} />
        <button
          className="mt-3 flex w-full items-center justify-center gap-2 rounded border border-red-400/24 bg-red-500/8 px-3 py-2 text-xs font-semibold text-red-100 hover:border-red-300/60 hover:bg-red-500/14"
          onClick={() => deleteEdge(selectedEdge.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {label('删除连线', 'Delete link')}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetricCard label={label('周期', 'Cycle')} value={`${formatNumber(getEdgeCycleTime(edgeData), 1)}s`} tone="purple" />
          <MetricCard label={label('能力', 'Capacity')} value={formatNumber(calculateEdgeCapacityPerHour(edgeData), 0)} hint="pcs/h" tone="info" />
        </div>

        <Section title={label('类型', 'Type')}>
          <label
            className="editable-field col-span-2 block rounded border border-slate-800 bg-slate-900/52 px-3 py-2"
            data-help={label('选择连线的实际物流方式；机械手模式会按取料、移动、放料、返回四段动作仿真。', 'Choose the physical transfer mode; loader arm simulates pick, move, place and return phases.')}
          >
            <span className="text-[11px] text-slate-500">{label('运输类型', 'Transport type')}</span>
            <select
              value={edgeData.transportType}
              onChange={(event) => onPatch({ transportType: event.target.value as TransportType })}
              className="mt-1 w-full bg-slate-950 text-sm font-semibold text-slate-100 outline-none"
            >
              <option value="conveyor">Conveyor</option>
              <option value="loader_arm">Loader Arm</option>
              <option value="manual">Manual</option>
              <option value="buffer_transfer">Buffer Transfer</option>
            </select>
          </label>
          <label
            className="editable-field col-span-2 block rounded border border-slate-800 bg-slate-900/52 px-3 py-2"
            data-help={label('切换连线几何形状；直角适合规整排布，圆滑适合快速草图。', 'Switch link geometry; right-angle is for clean layouts, smooth is for quick sketches.')}
          >
            <span className="text-[11px] text-slate-500">{label('连线形状', 'Link shape')}</span>
            <select
              value={edgeData.edgeShape ?? 'smooth'}
              onChange={(event) => onPatch({ edgeShape: event.target.value as EdgeShape })}
              className="mt-1 w-full bg-slate-950 text-sm font-semibold text-slate-100 outline-none"
            >
              <option value="smooth">{label('圆滑连接', 'Smooth')}</option>
              <option value="orthogonal">{label('直角连接', 'Right-angle')}</option>
            </select>
          </label>
          <Field label={label('连线名称', 'Link name')} type="text" value={edgeData.label} onChange={(value) => onPatch({ label: String(value) })} />
          <EdgeNumberField label={label('分配比例', 'Allocation ratio')} data={edgeData} edgeKey="allocationRatio" onPatch={onPatch} step={0.05} min={0} />
          <EdgeNumberField label={label('横向绕线偏移', 'Route offset X')} data={edgeData} edgeKey="routeOffsetX" onPatch={onPatch} step={12} min={-2000} />
          <EdgeNumberField label={label('纵向绕线偏移', 'Route offset Y')} data={edgeData} edgeKey="routeOffsetY" onPatch={onPatch} step={12} min={-2000} />
        </Section>

        {edgeData.transportType === 'loader_arm' ? (
          <Section title={label('上料手参数', 'Loader arm parameters')}>
            {armGroupId && armGroupEdges.length > 1 ? (
              <div className="col-span-2 rounded border border-violet-300/22 bg-violet-300/8 px-3 py-2 text-xs text-violet-100">
                {label('机械手总线', 'Arm bus')} {armGroupId}: {armGroupSources}→{armGroupTargets}, {armGroupEdges.length}{' '}
                {label('条可达关系共享 1 台机械手。修改本组参数会同步到整条总线。', 'routes share one physical arm. Changes apply to the whole bus.')}
              </div>
            ) : null}
            <Field label={label('机械手组 ID', 'Arm group ID')} type="text" value={edgeData.armGroupId} onChange={(value) => onPatch({ armGroupId: String(value) })} />
            <EdgeNumberField label={label('触发批量', 'Trigger batch')} data={edgeData} edgeKey="triggerBatch" onPatch={onPatch} min={1} />
            <EdgeNumberField label={label('单次夹取数量', 'Pick quantity')} data={edgeData} edgeKey="pickCount" onPatch={onPatch} min={1} />
            <EdgeNumberField label={label('取料时间 秒', 'Pick time sec')} data={edgeData} edgeKey="pickTimeSec" onPatch={onPatch} step={0.1} min={0} />
            <EdgeNumberField label={label('移动时间 秒', 'Move time sec')} data={edgeData} edgeKey="moveTimeSec" onPatch={onPatch} step={0.1} min={0} />
            <EdgeNumberField label={label('放料时间 秒', 'Place time sec')} data={edgeData} edgeKey="placeTimeSec" onPatch={onPatch} step={0.1} min={0} />
            <EdgeNumberField label={label('返回时间 秒', 'Return time sec')} data={edgeData} edgeKey="returnTimeSec" onPatch={onPatch} step={0.1} min={0} />
            <Field label={label('等待下游空间', 'Wait for downstream space')} type="checkbox" value={edgeData.waitForDownstreamSpace} onChange={(value) => onPatch({ waitForDownstreamSpace: Boolean(value) })} />
            <Field label={label('等待上游达到批量', 'Wait for upstream batch')} type="checkbox" value={edgeData.waitForUpstreamBatch} onChange={(value) => onPatch({ waitForUpstreamBatch: Boolean(value) })} />
          </Section>
        ) : (
          <Section title={label('输送线参数', 'Conveyor parameters')}>
            <EdgeNumberField label={label('运输时间 秒', 'Travel time sec')} data={edgeData} edgeKey="travelTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
            <EdgeNumberField label={label('接料间隔 秒', 'Dispatch interval sec')} data={edgeData} edgeKey="dispatchIntervalSec" onPatch={onPatch} step={0.1} min={0} />
            <EdgeNumberField label={label('单次运输数量', 'Transfer quantity')} data={edgeData} edgeKey="batchSize" onPatch={onPatch} min={1} />
            <EdgeNumberField label={label('在途容量', 'In-transit capacity')} data={edgeData} edgeKey="capacity" onPatch={onPatch} min={1} />
            <EdgeNumberField label={label('线体缓存上限', 'Line buffer capacity')} data={edgeData} edgeKey="lineBufferCapacity" onPatch={onPatch} min={0} />
            <EdgeNumberField label={label('当前线体缓存', 'Current line buffer')} data={edgeData} edgeKey="lineBufferCount" onPatch={onPatch} min={0} />
            <Field label={label('连续输送', 'Continuous transfer')} type="checkbox" value={edgeData.isContinuous} onChange={(value) => onPatch({ isContinuous: Boolean(value) })} />
            <Field label={label('允许缓存', 'Allow buffer')} type="checkbox" value={edgeData.allowBuffer} onChange={(value) => onPatch({ allowBuffer: Boolean(value) })} />
          </Section>
        )}

        <div className="mt-3 rounded border border-slate-800 bg-slate-900/45 p-3 text-xs text-slate-400">
          <div>
            {label('在途', 'In transit')} {edgeData.inTransit.length} {label('批', 'batches')}, {label('利用率', 'utilization')}{' '}
            {formatNumber(edgeData.utilization * 100, 1)}%
          </div>
          {edgeData.transportType !== 'loader_arm' ? (
            <div className="mt-1">
              {label('线体缓存', 'Line buffer')} {edgeData.lineBufferCount}/{edgeData.lineBufferCapacity}
            </div>
          ) : null}
          {edgeData.transportType === 'loader_arm' ? (
            <div className="mt-1">
              {label('阶段', 'Phase')} {edgeData.armPhase}, {label('等待取料', 'wait pick')} {formatNumber(edgeData.waitPickTime, 0)}s,{' '}
              {label('等待空间', 'wait space')} {formatNumber(edgeData.waitSpaceTime, 0)}s
            </div>
          ) : null}
          {edgeData.warning ? (
            <div className="mt-2 flex gap-2 text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{edgeData.warning}</span>
            </div>
          ) : null}
        </div>
      </aside>
    );
  }

  if (selectedNode) {
    const { params, metrics, runtime } = selectedNode.data;
    const onPatch = (patch: Partial<DeviceParameters>) => updateNodeParams(selectedNode.id, patch);
    const brushModes: ConfigBrushMode[] = ['same_type_takt', 'line_takt', 'same_type_ports', 'same_type_full'];
    const brushTargetCounts = Object.fromEntries(
      brushModes.map((mode) => [mode, getConfigBrushTargetCount(nodes, selectedNode.id, mode)]),
    ) as Record<ConfigBrushMode, number>;
    const onBrushPick = () => {
      startConfigBrush(selectedNode.id, brushMode);
      const changed = 0;
      setBrushFeedback(label(`已刷 ${changed} 台`, `Applied to ${changed}`));
      setBrushFeedback(label('已拿起，点击目标机床', 'Armed, click target'));
      setBrushFeedback('Applied: click target');
    };

    return (
      <aside className="h-full shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-950/94 p-3" style={{ width: panels.rightWidth }}>
        <PanelTitle icon={<Settings2 className="h-4 w-4" />} title={t(settings.language, 'parameters')} onCollapse={() => togglePanel('rightCollapsed')} />
        <button
          className="mt-3 flex w-full items-center justify-center gap-2 rounded border border-red-400/24 bg-red-500/8 px-3 py-2 text-xs font-semibold text-red-100 hover:border-red-300/60 hover:bg-red-500/14"
          onClick={() => deleteNode(selectedNode.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {label('删除工序卡片', 'Delete process card')}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetricCard label={label('状态', 'Status')} value={settings.language === 'zh-CN' ? statusLabels[runtime.status].zh : statusLabels[runtime.status].en} tone={runtime.status === 'running' ? 'good' : runtime.status === 'blocked' ? 'bad' : runtime.status === 'waiting_material' ? 'warn' : 'neutral'} />
          <MetricCard label={label('节拍', 'Takt')} value={`${formatNumber(metrics.averageSinglePieceTakt, 2)}s`} tone="info" />
          <MetricCard label={label('能力', 'Capacity')} value={formatNumber(metrics.theoreticalCapacityPerHour, 1)} hint="pcs/h" />
          <MetricCard label={label('仿真', 'Sim')} value={formatNumber(metrics.simulationCapacityPerHour, 1)} hint="pcs/h" />
        </div>

        <ConfigBrushPanel
          language={settings.language}
          targetCounts={brushTargetCounts}
          feedback={brushFeedback}
          selectedMode={brushMode}
          onModeChange={setBrushMode}
          onPick={onBrushPick}
          active={pendingConfigBrush?.sourceNodeId === selectedNode.id}
        />

        <div className="mt-3 space-y-2">
          <Field label={label('设备名称', 'Device name')} type="text" value={params.deviceName} onChange={(value) => onPatch({ deviceName: String(value) })} />
          <Field label={label('工序简称', 'Process short name')} type="text" value={params.deviceShortName} onChange={(value) => onPatch({ deviceShortName: String(value) })} />
          <Field label={label('设备编号', 'Device code')} type="text" value={params.deviceCode} onChange={(value) => onPatch({ deviceCode: String(value) })} />
          <Field label={label('是否启用', 'Enabled')} type="checkbox" value={params.enabled} onChange={(value) => onPatch({ enabled: Boolean(value) })} />
        </div>

        <Section title={label('端口与料型', 'Ports and material')}>
          {params.deviceType !== 'material_source' ? (
            <NumberField label={label('输入端口数', 'Input ports')} params={params} paramKey="inputPortCount" onPatch={(patch) => onPatch({ inputPortCount: Math.min(4, Math.max(1, Number(patch.inputPortCount ?? 1))) })} min={1} />
          ) : null}
          {params.deviceType !== 'finished_sink' ? (
            <NumberField label={label('输出端口数', 'Output ports')} params={params} paramKey="outputPortCount" onPatch={(patch) => onPatch({ outputPortCount: Math.min(4, Math.max(1, Number(patch.outputPortCount ?? 1))) })} min={1} />
          ) : null}
          <label
            className="editable-field col-span-2 block rounded border border-slate-800 bg-slate-900/52 px-3 py-2"
            data-help={label('定义该设备处理的料型，用于防止大圈、小圈混线并辅助端口筛选。', 'Defines material kind to prevent big/part B mixing and support port filtering.')}
          >
            <span className="text-[11px] text-slate-500">{label('工件料型', 'Material kind')}</span>
            <select
              value={params.materialKind}
              onChange={(event) => onPatch({ materialKind: event.target.value as DeviceParameters['materialKind'] })}
              className="mt-1 w-full bg-slate-950 text-sm font-semibold text-slate-100 outline-none"
            >
              <option value="mixed">{label('混合/不限', 'Mixed')}</option>
              <option value="part_a">{label('A件', 'Part A')}</option>
              <option value="part_b">{label('B件', 'Part B')}</option>
            </select>
          </label>
          {params.deviceType === 'storage_feeder' || params.deviceType === 'material_source' ? (
            <>
              <label
                className="editable-field block rounded border border-slate-800 bg-slate-900/52 px-3 py-2"
                data-help={label('设置第一个输出口吐出的物料类型，连接时会用于校验下游工序。', 'Sets material type emitted by output 1 and validates downstream compatibility.')}
              >
                <span className="text-[11px] text-slate-500">{label('输出1料型', 'Output 1 material')}</span>
                <select
                  value={params.output1MaterialKind}
                  onChange={(event) => onPatch({ output1MaterialKind: event.target.value as DeviceParameters['output1MaterialKind'] })}
                  className="mt-1 w-full bg-slate-950 text-sm font-semibold text-slate-100 outline-none"
                >
                  <option value="part_a">{label('A件', 'Part A')}</option>
                  <option value="part_b">{label('B件', 'Part B')}</option>
                  <option value="mixed">{label('混合', 'Mixed')}</option>
                </select>
              </label>
              <label
                className="editable-field block rounded border border-slate-800 bg-slate-900/52 px-3 py-2"
                data-help={label('设置第二个输出口吐出的物料类型，适合一台送料机分大圈和小圈。', 'Sets material type emitted by output 2 for feeders splitting big and part Bs.')}
              >
                <span className="text-[11px] text-slate-500">{label('输出2料型', 'Output 2 material')}</span>
                <select
                  value={params.output2MaterialKind}
                  onChange={(event) => onPatch({ output2MaterialKind: event.target.value as DeviceParameters['output2MaterialKind'] })}
                  className="mt-1 w-full bg-slate-950 text-sm font-semibold text-slate-100 outline-none"
                >
                  <option value="part_a">{label('A件', 'Part A')}</option>
                  <option value="part_b">{label('B件', 'Part B')}</option>
                  <option value="mixed">{label('混合', 'Mixed')}</option>
                </select>
              </label>
            </>
          ) : null}
        </Section>

        {selectedPort?.nodeId === selectedNode.id ? (
          <PortRuleEditor
            language={settings.language}
            params={params}
            selectedPort={selectedPort}
            onPatch={(patch) => updatePortRule(selectedNode.id, selectedPort.side, selectedPort.handleId, patch)}
          />
        ) : null}

        {supportsTaktSettings(params) ? (
          <TaktSettingsPanel params={params} metrics={metrics} language={settings.language} onPatch={onPatch} />
        ) : null}

        <Section title={label('缓存参数', 'Buffer parameters')}>
          {params.deviceType !== 'material_source' ? (
            <>
              <NumberField label={label('前缓存上限', 'Input buffer capacity')} params={params} paramKey="inputBufferCapacity" onPatch={onPatch} min={0} />
              <NumberField label={label('当前前缓存', 'Current input buffer')} params={params} paramKey="inputBufferCount" onPatch={onPatch} min={0} />
            </>
          ) : null}
          {params.deviceType !== 'finished_sink' ? (
            <>
              <NumberField label={label('后缓存上限', 'Output buffer capacity')} params={params} paramKey="outputBufferCapacity" onPatch={onPatch} min={0} />
              <NumberField label={label('当前后缓存', 'Current output buffer')} params={params} paramKey="outputBufferCount" onPatch={onPatch} min={0} />
            </>
          ) : null}
          <NumberField label={label('初始物料数量', 'Initial material count')} params={params} paramKey="initialMaterials" onPatch={onPatch} min={0} />
        </Section>

        {params.deviceType === 'storage_feeder' ? (
          <Section title={label('储料机', 'Storage feeder')}>
            <NumberField label={label('料仓容量', 'Storage capacity')} params={params} paramKey="storageCapacity" onPatch={onPatch} min={0} />
            <NumberField label={label('当前料仓数量', 'Current storage count')} params={params} paramKey="currentStorageCount" onPatch={onPatch} min={0} />
            <NumberField label={label('每次吐料数量', 'Feed batch quantity')} params={params} paramKey="feedBatchSize" onPatch={onPatch} min={1} />
            <NumberField label={label('吐料间隔 秒', 'Feed interval sec')} params={params} paramKey="feedIntervalSec" onPatch={onPatch} step={0.1} min={0.1} />
          </Section>
        ) : null}

        {params.deviceType === 'merge_buffer' ? (
          <Section title={label('装配储料机', 'Assembly storage feeder')}>
            <NumberField label={label('A件储料上限', 'Part A storage cap')} params={params} paramKey="partAStorageCapacity" onPatch={onPatch} min={0} />
            <NumberField label={label('当前大圈储料', 'Current part As')} params={params} paramKey="partAStorageCount" onPatch={onPatch} min={0} />
            <NumberField label={label('B件储料上限', 'Part B storage cap')} params={params} paramKey="partBStorageCapacity" onPatch={onPatch} min={0} />
            <NumberField label={label('当前小圈储料', 'Current part Bs')} params={params} paramKey="partBStorageCount" onPatch={onPatch} min={0} />
            <NumberField label={label('主动吐料数量', 'Backup feed batch')} params={params} paramKey="feedBatchSize" onPatch={onPatch} min={1} />
            <NumberField label={label('主动吐料间隔 秒', 'Backup feed interval sec')} params={params} paramKey="feedIntervalSec" onPatch={onPatch} step={0.1} min={0.1} />
            <div className="col-span-2 rounded border border-cyan-300/18 bg-cyan-300/8 px-3 py-2 text-xs text-cyan-100">
              {label('in-1/out-1 为大圈侧，in-2/out-2 为小圈侧；下游有空间时连线直接拉料，下游缺料且大连线暂时无料时由储料侧补料。', 'in-1/out-1 are part-A side, in-2/out-2 are part-B side. Downstream links pull through when available; stored material backs up the line when upstream pauses.')}
            </div>
          </Section>
        ) : null}

        {params.deviceType === 'material_source' ? (
          <Section title={label('无限料源', 'Material source')}>
            <NumberField label={label('每次出料数量', 'Output batch quantity')} params={params} paramKey="feedBatchSize" onPatch={onPatch} min={1} />
            <NumberField label={label('出料间隔 秒', 'Output interval sec')} params={params} paramKey="feedIntervalSec" onPatch={onPatch} step={0.1} min={0.1} />
          </Section>
        ) : null}

        {params.deviceType === 'wash_dry' ? (
          <Section title={label('清洗与风干', 'Cleaning and air dry')}>
            <NumberField label={label('通道数量', 'Lane count')} params={params} paramKey="cleanerLaneCount" onPatch={onPatch} min={1} />
            <NumberField label={label('单通道在途容量', 'Capacity per lane')} params={params} paramKey="cleanerLaneCapacity" onPatch={onPatch} min={1} />
            <NumberField label={label('推料间隔 秒', 'Push interval sec')} params={params} paramKey="cleanerPushIntervalSec" onPatch={onPatch} step={0.1} min={0.1} />
            <NumberField label={label('风干批量', 'Air dry batch')} params={params} paramKey="cleanerAirBatchSize" onPatch={onPatch} min={1} />
            <NumberField label={label('风干时间 秒', 'Air dry time sec')} params={params} paramKey="cleanerAirTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
            <NumberField label={label('当前机内在途', 'Current internal WIP')} params={params} paramKey="cleanerInternalCount" onPatch={onPatch} min={0} />
            <NumberField label={label('出口待风干', 'Waiting air dry')} params={params} paramKey="cleanerReadyCount" onPatch={onPatch} min={0} />
            <div className="col-span-2 rounded border border-teal-300/18 bg-teal-300/8 px-3 py-2 text-xs text-teal-100">
              {label('累计到风干批量后停下风干，风干完成后一次释放该批物料；后段堵料时不会继续推料。', 'The outlet waits until the air-dry batch is reached, dries it, then releases the batch. If downstream is blocked, pushing stops.')}
            </div>
          </Section>
        ) : null}

        {params.deviceType === 'finished_sink' || params.deviceType === 'packing_sink' ? (
          <Section title={label('成品终点', 'Finished output')}>
            <NumberField label={label('当前输入缓存', 'Current input buffer')} params={params} paramKey="inputBufferCount" onPatch={onPatch} min={0} />
            <div className="col-span-2 rounded border border-emerald-300/18 bg-emerald-300/8 px-3 py-2 text-xs text-emerald-100">
              {label('终点会无限接收来料，并把累计产出作为成品数。', 'The sink accepts incoming material and counts total output as finished goods.')}
            </div>
          </Section>
        ) : null}

        {params.deviceType === 'spin_dryer' ? (
          <Section title={label('甩干机', 'Spin dryer')}>
            <NumberField label={label('每列数量', 'Pieces per column')} params={params} paramKey="dryerColumnBatchSize" onPatch={onPatch} min={1} />
            <NumberField label={label('列数', 'Column count')} params={params} paramKey="dryerColumnCount" onPatch={onPatch} min={1} />
            <NumberField label={label('甩干时间 秒', 'Dry time sec')} params={params} paramKey="dryerDryTimeSec" onPatch={onPatch} step={0.1} min={0.1} />
            <NumberField label={label('已装湿列', 'Loaded wet columns')} params={params} paramKey="dryerLoadedColumns" onPatch={onPatch} min={0} />
            <NumberField label={label('已甩干列', 'Dried columns')} params={params} paramKey="dryerDriedColumns" onPatch={onPatch} min={0} />
          </Section>
        ) : null}

      </aside>
    );
  }

  return (
    <aside className="h-full shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-950/94 p-3" style={{ width: panels.rightWidth }}>
      <PanelTitle icon={<Power className="h-4 w-4" />} title={t(settings.language, 'lineOverview')} onCollapse={() => togglePanel('rightCollapsed')} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricCard label={t(settings.language, 'capacity')} value={formatNumber(summary.theoreticalCapacityPerHour, 1)} hint="pcs/h" tone="info" />
        <MetricCard label={t(settings.language, 'simulationCapacity')} value={formatNumber(summary.simulationCapacityPerHour, 1)} hint="pcs/h" tone="good" />
        <MetricCard label={t(settings.language, 'bottleneck')} value={summary.bottleneck.label} tone="warn" />
        <MetricCard label={t(settings.language, 'lineBalance')} value={`${formatNumber(summary.bottleneck.lineBalanceRate * 100, 1)}%`} tone="purple" />
      </div>

      <div className="mt-3 rounded border border-amber-300/18 bg-amber-300/8 p-3 text-xs text-amber-100">
        <div className="font-semibold">{t(settings.language, 'reason')}</div>
        <p className="mt-2 leading-relaxed text-amber-50/80">{summary.bottleneck.reason}</p>
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label('工序阶段识别', 'Stage recognition')}</div>
        {summary.stageAnalysis.length === 0 ? (
          <div className="rounded border border-slate-800 bg-slate-900/45 p-3 text-xs text-slate-500">
            {label('搭建并连接产线后，这里会自动归并工序A、精加工A、工序B、工序C、精加工B等阶段。', 'Build and connect a line to recognize stages automatically.')}
          </div>
        ) : (
          summary.stageAnalysis.map((stage) => (
            <div key={stage.key} className="rounded border border-slate-800 bg-slate-900/52 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-100">{stage.label}</span>
                <span className="text-cyan-100">{formatNumber(stage.capacityPerHour, 0)} pcs/h</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-slate-400">
                <span>{label('节点', 'Nodes')} {stage.nodeIds.length}</span>
                <span>{label('节拍', 'Takt')} {formatNumber(stage.avgTaktSec, 2)}s</span>
                <span>{label('产出', 'Out')} {stage.totalOutput}</span>
              </div>
              {stage.notes[0] ? <div className="mt-2 text-slate-500">{stage.notes[0]}</div> : null}
            </div>
          ))
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{t(settings.language, 'issueRanking')}</div>
        {ranking.map((node) => (
          <div key={node.id} className="rounded border border-slate-800 bg-slate-900/52 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-slate-100">{node.data.params.deviceShortName}</span>
              <span className="text-slate-500">{settings.language === 'zh-CN' ? statusLabels[node.data.runtime.status].zh : statusLabels[node.data.runtime.status].en}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-slate-400">
              <span>WAIT {formatNumber(node.data.metrics.totalWaitingTime, 0)}s</span>
              <span>BLOCK {formatNumber(node.data.metrics.totalBlockedTime, 0)}s</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded border border-slate-800 bg-slate-900/45 p-3 text-xs text-slate-400">
        <div className="font-semibold text-slate-200">{t(settings.language, 'recommendations')}</div>
        <div className="mt-2 space-y-2">
          {summary.bottleneck.recommendations.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      </div>
    </aside>
  );
}
