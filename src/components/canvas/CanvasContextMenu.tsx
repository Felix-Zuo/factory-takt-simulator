import type { AppSettings, DeviceParameters, DeviceType, FactoryEdge, FactoryNode, FlowEdgeData } from '../../types/factory';

export type CanvasContextMenuState =
  | { kind: 'pane'; x: number; y: number; flowPosition: { x: number; y: number } }
  | { kind: 'node'; x: number; y: number; nodeId: string }
  | { kind: 'edge'; x: number; y: number; edgeId: string }
  | null;

interface CanvasContextMenuProps {
  state: CanvasContextMenuState;
  nodes: FactoryNode[];
  edges: FactoryEdge[];
  language: string;
  snapToGrid: boolean;
  hideText: boolean;
  onClose: () => void;
  onAddDevice: (type: DeviceType, position: { x: number; y: number }) => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onUpdateNode: (nodeId: string, patch: Partial<DeviceParameters>) => void;
  onUpdateEdge: (edgeId: string, patch: Partial<FlowEdgeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFitView: () => void;
  onZoomReset: () => void;
}

export function CanvasContextMenu({
  state,
  nodes,
  edges,
  language,
  snapToGrid,
  hideText,
  onClose,
  onAddDevice,
  onUpdateSettings,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onUndo,
  onRedo,
  onFitView,
  onZoomReset,
}: CanvasContextMenuProps) {
  if (!state) return null;

  const zh = language === 'zh-CN';
  const node = state.kind === 'node' ? nodes.find((item) => item.id === state.nodeId) : null;
  const edge = state.kind === 'edge' ? edges.find((item) => item.id === state.edgeId) : null;
  const itemClass = 'context-menu-item block w-full rounded px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800';
  const position = state.kind === 'pane' ? state.flowPosition : null;
  const menuX = Math.min(state.x, window.innerWidth - 230);
  const menuY = Math.min(state.y, window.innerHeight - 300);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      className="context-menu fixed z-[80] w-56 rounded-md border border-slate-700 bg-slate-950/98 p-1.5 shadow-2xl shadow-black/40 backdrop-blur"
      style={{ left: menuX, top: menuY }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {state.kind === 'pane' && position ? (
        <>
          <button className={itemClass} onClick={() => run(() => onAddDevice('or_grinder', position))}>
            {zh ? '添加大沟' : 'Add big groove'}
          </button>
          <button className={itemClass} onClick={() => run(() => onAddDevice('material_source', position))}>
            {zh ? '添加料源' : 'Add source'}
          </button>
          <button className={itemClass} onClick={() => run(() => onAddDevice('ir_grinder', position))}>
            {zh ? '添加小沟' : 'Add small groove'}
          </button>
          <button className={itemClass} onClick={() => run(() => onAddDevice('general_gauge', position))}>
            {zh ? '添加通用检测' : 'Add gauge'}
          </button>
          <button className={itemClass} onClick={() => run(() => onAddDevice('spin_dryer', position))}>
            {zh ? '添加甩干机' : 'Add dryer'}
          </button>
          <button className={itemClass} onClick={() => run(() => onAddDevice('finished_sink', position))}>
            {zh ? '添加成品终点' : 'Add end point'}
          </button>
          <MenuDivider />
          <button className={itemClass} onClick={() => run(() => onUpdateSettings({ snapToGrid: !snapToGrid }))}>
            {snapToGrid ? (zh ? '切换为自由放置' : 'Switch to free placement') : (zh ? '切换为网格对齐' : 'Switch to grid snap')}
          </button>
          <button className={itemClass} onClick={() => run(() => onUpdateSettings({ hideText: !hideText }))}>
            {hideText ? (zh ? '显示文字' : 'Show text') : (zh ? '隐藏所有文字' : 'Hide text')}
          </button>
          <button className={itemClass} onClick={() => run(onFitView)}>
            {zh ? '适配全部（中键）' : 'Fit all (middle click)'}
          </button>
          <button className={itemClass} onClick={() => run(onZoomReset)}>
            {zh ? '缩放回 100%' : 'Reset zoom to 100%'}
          </button>
          <MenuDivider />
          <button className={itemClass} onClick={() => run(onUndo)}>
            {zh ? '撤回 Ctrl+Z' : 'Undo Ctrl+Z'}
          </button>
          <button className={itemClass} onClick={() => run(onRedo)}>
            {zh ? '重做 Ctrl+Y' : 'Redo Ctrl+Y'}
          </button>
        </>
      ) : null}
      {node ? (
        <>
          <div className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">{node.data.params.deviceShortName}</div>
          <PortButton
            node={node}
            itemClass={itemClass}
            zh={zh}
            onUpdateNode={onUpdateNode}
            run={run}
            kind="input"
          />
          <PortButton
            node={node}
            itemClass={itemClass}
            zh={zh}
            onUpdateNode={onUpdateNode}
            run={run}
            kind="output"
          />
          <button
            className={itemClass}
            onClick={() =>
              run(() =>
                onUpdateNode(node.id, {
                  inputPortCount: node.data.params.deviceType === 'material_source' ? node.data.params.inputPortCount : 1,
                  outputPortCount: node.data.params.deviceType === 'finished_sink' ? node.data.params.outputPortCount : 1,
                }),
              )
            }
          >
            {zh ? '恢复一进一出' : 'Reset to 1 in / 1 out'}
          </button>
          <MenuDivider />
          <button className={`${itemClass} text-red-200`} onClick={() => run(() => onDeleteNode(node.id))}>
            {zh ? '删除工序卡片' : 'Delete process'}
          </button>
        </>
      ) : null}
      {edge?.data ? (
        <>
          <div className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">{edge.data.label}</div>
          <button className={itemClass} onClick={() => run(() => onUpdateEdge(edge.id, { transportType: 'conveyor', label: 'Conveyor' }))}>
            {zh ? '设为输送线' : 'Set Conveyor'}
          </button>
          <button className={itemClass} onClick={() => run(() => onUpdateEdge(edge.id, { transportType: 'loader_arm', label: 'Loader Arm' }))}>
            {zh ? '设为机械手' : 'Set Loader Arm'}
          </button>
          <button className={itemClass} onClick={() => run(() => onUpdateEdge(edge.id, { edgeShape: 'smooth' }))}>
            {zh ? '圆滑连接' : 'Smooth link'}
          </button>
          <button className={itemClass} onClick={() => run(() => onUpdateEdge(edge.id, { edgeShape: 'orthogonal' }))}>
            {zh ? '直角连接' : 'Right-angle link'}
          </button>
          <button className={itemClass} onClick={() => run(() => onUpdateEdge(edge.id, { routeOffsetX: 0, routeOffsetY: 0 }))}>
            {zh ? '重置连线方向' : 'Reset route'}
          </button>
          <MenuDivider />
          <button className={`${itemClass} text-red-200`} onClick={() => run(() => onDeleteEdge(edge.id))}>
            {zh ? '删除连线' : 'Delete link'}
          </button>
        </>
      ) : null}
    </div>
  );
}

function PortButton({
  node,
  itemClass,
  zh,
  kind,
  onUpdateNode,
  run,
}: {
  node: FactoryNode;
  itemClass: string;
  zh: boolean;
  kind: 'input' | 'output';
  onUpdateNode: (nodeId: string, patch: Partial<DeviceParameters>) => void;
  run: (action: () => void) => void;
}) {
  const params = node.data.params;
  if (kind === 'input' && params.deviceType === 'material_source') return null;
  if (kind === 'output' && params.deviceType === 'finished_sink') return null;
  const key = kind === 'input' ? 'inputPortCount' : 'outputPortCount';
  return (
    <button className={itemClass} onClick={() => run(() => onUpdateNode(node.id, { [key]: Math.min(2, (params[key] ?? 1) + 1) }))}>
      {kind === 'input' ? (zh ? '增加输入端口' : 'Add input port') : zh ? '增加输出端口' : 'Add output port'}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-slate-800" />;
}
