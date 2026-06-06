import { BookOpen, Cable, Grid3X3, MousePointer2, PanelBottom, Settings2 } from 'lucide-react';
import { useFactoryStore } from '../../store/factoryStore';

const zhSteps = [
  ['1. 建立头尾', '先拖入 SRC 或 FEED 作为料源，再拖入 END 作为成品终点。SRC 适合不断供料，END 会统计最终产出。'],
  ['2. 拖入工序', '按实际路线拖入加工、检测、清洗、缓存、装配和包装类模块。默认设备参数可以直接运行，也可以在右侧进一步调整。'],
  ['3. 设置端口', '点击设备端口可以配置输入/输出规则。端口支持物料筛选、轮询、堵塞跳过等基础路由策略。'],
  ['4. 建立连线', '从卡片右侧输出口拖到下游输入口，或先点输出口再点输入口。连线代表物流路径，不是单独设备。'],
  ['5. 设置输送线', '点击连线后可设置运输类型、运输时间、单次运输数量、在途容量和线体缓存。'],
  ['6. 设置机械手', '把连线类型切到 Loader Arm 后，可以设置取料、移动、放料、返回时间。多条路线使用同一机械手组 ID 时会合并为一条机械手总线。'],
  ['7. 配置节拍', '设备支持详细模式和直接节拍模式。详细模式会计算修整、耗材更换、稼动率和良率，并在仿真中体现停机。'],
  ['8. 调整布局', '顶部可以切换网格对齐或自由放置。拖动左右和底部边线可以调整面板尺寸，避免内容显示不全。'],
  ['9. 保存方案', '点击保存/加载打开方案库。可以保存多个命名方案，也可以导入或导出 JSON。'],
  ['10. 运行分析', '点击开始后观察运行、待料、堵料、缓存、物流点和瓶颈分析。后台仿真可以直接按时间或产量生成报告。'],
];

const enSteps = [
  ['1. Add start and end', 'Use SRC or FEED as material input, and END as the finished output counter.'],
  ['2. Add processes', 'Drag machining, inspection, cleaning, buffer, assembly, and packing modules onto the canvas. Defaults run immediately and can be tuned later.'],
  ['3. Configure ports', 'Select a port to set input/output rules such as material filter, round-robin routing, and skip-when-blocked behavior.'],
  ['4. Connect nodes', 'Drag from an output port to an input port, or click output then input. A link represents a transfer route, not a separate machine.'],
  ['5. Configure conveyors', 'Select a link to set transfer type, travel time, batch quantity, in-transit capacity, and line buffer.'],
  ['6. Configure loader arms', 'Switch a link to Loader Arm to set pick, move, place, and return time. Routes sharing one arm group ID merge into one arm bus.'],
  ['7. Configure takt', 'Devices support detailed mode and direct takt mode. Detailed mode includes dressing, consumables, uptime, yield, and downtime in simulation.'],
  ['8. Adjust layout', 'Use grid snap or free placement. Drag panel borders to resize the left, right, and bottom panels.'],
  ['9. Save scenarios', 'Open the scenario library from Save/Load. Keep multiple named scenarios and import or export JSON files.'],
  ['10. Run analysis', 'Start the simulation and review running, waiting, blocking, buffers, material dots, and bottleneck analysis. Background simulation can generate reports by time or output target.'],
];

export function TutorialPage() {
  const settings = useFactoryStore((state) => state.settings);
  const zh = settings.language === 'zh-CN';
  const steps = zh ? zhSteps : enSteps;

  return (
    <main className="h-full overflow-y-auto bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">{zh ? '使用教程' : 'Tutorial'}</div>
            <h2 className="mt-1 text-2xl font-semibold">
              {zh ? '从空白画布到可运行产线' : 'From Blank Canvas To Running Line'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {steps.map(([title, body], index) => (
            <section key={title} className="rounded-md border border-slate-800 bg-slate-900/55 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-50">
                {index % 5 === 0 ? <MousePointer2 className="h-4 w-4 text-cyan-200" /> : null}
                {index % 5 === 1 ? <Settings2 className="h-4 w-4 text-emerald-200" /> : null}
                {index % 5 === 2 ? <Cable className="h-4 w-4 text-violet-200" /> : null}
                {index % 5 === 3 ? <Grid3X3 className="h-4 w-4 text-amber-200" /> : null}
                {index % 5 === 4 ? <PanelBottom className="h-4 w-4 text-sky-200" /> : null}
                {title}
              </div>
              <p className="text-sm leading-relaxed text-slate-400">{body}</p>
            </section>
          ))}
        </div>

        <section className="mt-5 rounded-md border border-cyan-300/20 bg-slate-900/50 p-4">
          <div className="mb-3 text-sm font-semibold text-cyan-100">
            {zh ? '快捷键与鼠标操作' : 'Shortcuts And Mouse Controls'}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-400">
            <p>{zh ? 'Ctrl+Z 撤回，Ctrl+Y / Ctrl+Shift+Z 重做，Ctrl+S 快速保存当前方案。' : 'Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo, Ctrl+S quick-save the current scenario.'}</p>
            <p>{zh ? '空格开始/暂停，Ctrl+R 重置仿真，Delete 删除当前选中的卡片或连线。' : 'Space starts/pauses, Ctrl+R resets, Delete removes the selected node or link.'}</p>
            <p>{zh ? '右键空白处可以添加工序、切换网格、隐藏文字、适配视图、撤回或重做。' : 'Right-click the canvas to add processes, toggle grid/text, fit view, undo, or redo.'}</p>
            <p>{zh ? '中键点击画布可快速适配全部；左下缩放条可以精确调整倍率。' : 'Middle-click the canvas to fit all; use the lower-left slider for exact zoom.'}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
