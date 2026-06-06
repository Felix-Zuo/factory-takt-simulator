import { BookOpen, Cable, Grid3X3, MousePointer2, PanelBottom, Settings2 } from 'lucide-react';
import { useFactoryStore } from '../../store/factoryStore';

const zhSteps = [
  ['1. 建立头尾', '先拖入 SRC 或 FEED 作为料源，再拖入 END 作为成品终点。SRC 适合源源不断供料，END 会统计最终产出。'],
  ['2. 拖入工序', '根据现场路线拖入大沟、大超、小沟、内径、小超、检测、DRY。所有机床默认一次加工 1 个工件。'],
  ['3. 配置料型', '点击储料机或料源，在右侧设置输出 1 / 输出 2 是大圈还是小圈。大圈只能进入大沟、大超，小圈只能进入小沟、内径、小超。'],
  ['4. 建立连线', '从卡片右侧输出端口拖到下道左侧输入端口，或点击输出端口后再点击输入端口。右键卡片可以增加第二个输入/输出端口。'],
  ['5. 设置输送线', '点击连线，选择 Conveyor，设置运输时间、单次运输数量、在途容量和线体缓存。下游满料时线体缓存会先接料。'],
  ['6. 设置机械手', '点击连线，选择 Loader Arm。同一只机械手服务多台设备时，把多条连线设置成同一个机械手组 ID，画布会合并成 ARM BUS。'],
  ['7. 使用配置刷', '选中设备后，右侧配置刷可以刷同类节拍、整线节拍、同类端口缓存或同类完整参数；它不会覆盖当前 WIP 和累计产出。'],
  ['8. 调整布局', '顶部可切换网格对齐/自由放置。拖动左、右、底部边线可以改变面板尺寸，避免内容显示不全。'],
  ['9. 展示模式', '点击顶部“文字”按钮可一键隐藏画布文字，只保留标识、状态灯、连线和动画效果。'],
  ['10. 开始仿真', '点击开始后观察绿色运行、黄色待料、红色堵料。右侧和底部会显示阶段节拍、瓶颈和建议。'],
  ['11. 保存和发送', '点击保存/加载打开方案库，可命名保存多个方案、选择任意方案恢复，也可导入别人导出的 JSON。便携版可直接发给别人，解压后双击 exe 或 START.bat。'],
];

const enSteps = [
  ['1. Add start and end', 'Use SRC or FEED as material input, and END as the finished output counter.'],
  ['2. Add processes', 'Drag big groove, big super, small groove, bore, small super, gauge, and DRY nodes onto the canvas. Machines default to one piece per cycle.'],
  ['3. Configure materials', 'Set feeder output 1 / output 2 to big ring or small ring. Big rings go to big groove / big super; small rings go to small groove / bore / small super.'],
  ['4. Connect nodes', 'Drag from an output port to an input port, or click output then input. Right-click a node to add the second port.'],
  ['5. Configure conveyors', 'Select a link, choose Conveyor, and set travel time, batch, transit capacity, and line buffer.'],
  ['6. Configure loader arms', 'Select a link, choose Loader Arm, and use the same arm group ID for routes sharing one physical arm bus.'],
  ['7. Use config brushes', 'After selecting a device, use the brush tools to copy same-type takt, line takt, same-type port buffers, or same-type full configuration without overwriting current WIP/output.'],
  ['8. Adjust layout', 'Toggle grid snap/free placement from the toolbar. Drag panel borders to resize the left, right, and bottom panels.'],
  ['9. Showcase view', 'Use the Text button to hide canvas text and keep only icons, lamps, links, and motion.'],
  ['10. Run simulation', 'Start the simulation and watch running, waiting, blocked, stage takt, and bottleneck analysis.'],
  ['11. Save and share', 'Open the scenario library from Save/Load, keep multiple named scenarios, load any saved version, and import JSON from others. Send the portable package so others can double-click to use it.'],
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
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">
              {zh ? '使用教程' : 'Tutorial'}
            </div>
            <h2 className="mt-1 text-2xl font-semibold">
              {zh ? '从空白画布到可仿真的产线' : 'From Blank Canvas To Running Line'}
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
            <p>{zh ? 'Ctrl+Z 撤回，Ctrl+Y / Ctrl+Shift+Z 重做，Ctrl+S 快速保存当前方案。' : 'Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo, Ctrl+S quick-save the scenario.'}</p>
            <p>{zh ? '空格开始/暂停，Ctrl+R 重置仿真，Delete 删除当前选中的卡片或连线。' : 'Space starts/pauses, Ctrl+R resets, Delete removes the selected node or link.'}</p>
            <p>{zh ? '右键空白处可添加工序、切换网格、隐藏文字、适配视图和撤回重做。' : 'Right-click the canvas to add processes, toggle grid/text, fit view, undo, or redo.'}</p>
            <p>{zh ? '中键点击画布可快速适配全部；左下缩放条可精确调整任意倍率。' : 'Middle-click the canvas to fit all; use the lower-left slider for exact zoom.'}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
