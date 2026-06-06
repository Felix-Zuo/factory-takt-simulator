import { Activity, Bot, Cable, Database, Factory, Gauge, PackageCheck, Route, SlidersHorizontal } from 'lucide-react';
import { useFactoryStore } from '../../store/factoryStore';

const zh = {
  eyebrow: 'PROJECT OVERVIEW',
  title: 'Factory Takt Simulator',
  subtitle: '面向离散制造产线的模块化节拍仿真工作台。它把设备、缓存、连线、机械手和工序节拍放到同一个可视沙盘里，用于快速验证产线能力和瓶颈风险。',
  points: ['拖拽搭建工序', '连线定义物流', '节拍自动计算', '动态仿真运行', '报告与记录导出'],
  cards: [
    ['模块化产线', '设备是可组合模块，路线由用户自己连接，适合表达分流、合流、缓存、检测和装配节拍。'],
    ['真实物流约束', '连线有运输时间、在途容量和缓存。机械手支持取料、移动、放料、返回四段动作。'],
    ['节拍与停机', '详细模式会把修整、换耗材、稼动率和良率计入综合节拍，并在仿真中体现停机。'],
    ['可二次封装', '保留浏览器侧智能体接口，外部自动化可以读取状态、导入方案、控制仿真并生成报告。'],
  ],
  flowTitle: '仿真流程',
  flow: ['建模', '配置', '运行', '分析', '交付'],
  bridgeTitle: '智能体接口',
  bridgeText: '运行后可通过 window.FactoryTaktAgent 调用当前沙盘状态、方案导入导出、后台仿真和参数调整。这个接口不绑定任何服务，便于接入自己的助手、脚本或桌面封装。',
  exampleTitle: '典型画面',
};

const en = {
  eyebrow: 'PROJECT OVERVIEW',
  title: 'Factory Takt Simulator',
  subtitle:
    'A modular takt simulation workstation for discrete manufacturing lines. It brings machines, buffers, transfer links, loader arms, and takt logic into one visual sandbox for capacity and bottleneck review.',
  points: ['Drag processes', 'Connect transfer routes', 'Calculate takt', 'Run simulation', 'Export records'],
  cards: [
    ['Modular Line Model', 'Processes are composable modules. Routes are defined by the user, including split, merge, buffer, inspection, and assembly flows.'],
    ['Transfer Constraints', 'Links include travel time, in-transit capacity, and line buffer. Loader arms model pick, move, place, and return phases.'],
    ['Takt And Downtime', 'Detailed mode includes dressing, consumables, uptime, and yield in takt calculation and runtime pauses.'],
    ['Integration Ready', 'A browser-side agent bridge exposes state, scenario import/export, simulation controls, and reports for custom wrappers.'],
  ],
  flowTitle: 'Simulation Flow',
  flow: ['Model', 'Configure', 'Run', 'Analyze', 'Deliver'],
  bridgeTitle: 'Agent Bridge',
  bridgeText:
    'After launch, external automation can use window.FactoryTaktAgent to read the sandbox, import scenarios, control simulation, run background analysis, and collect reports. The bridge is local and service-free.',
  exampleTitle: 'Visual System',
};

export function ShowcasePage() {
  const settings = useFactoryStore((state) => state.settings);
  const text = settings.language === 'zh-CN' ? zh : en;

  return (
    <main className="h-full overflow-y-auto bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden border-b border-slate-800 px-8 py-10">
        <div className="absolute inset-0 industrial-grid opacity-35" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-[1fr_520px] gap-10">
          <div>
            <div className="mb-4 text-xs uppercase tracking-[0.28em] text-cyan-200">{text.eyebrow}</div>
            <h2 className="text-5xl font-semibold tracking-tight text-slate-50">{text.title}</h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">{text.subtitle}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {text.points.map((point) => (
                <span key={point} className="rounded border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-xs text-cyan-100">
                  {point}
                </span>
              ))}
            </div>
          </div>
          <HeroDiagram />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-4 gap-4 px-8 py-8">
        {text.cards.map(([title, body], index) => (
          <article key={title} className="rounded-md border border-slate-800 bg-slate-900/55 p-5">
            <FeatureIcon index={index} />
            <h3 className="mt-4 text-base font-semibold text-slate-50">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-[1.1fr_.9fr] gap-5 px-8 pb-10">
        <article className="rounded-md border border-slate-800 bg-slate-900/55 p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Route className="h-4 w-4" />
            {text.flowTitle}
          </div>
          <div className="grid grid-cols-5 gap-3">
            {text.flow.map((step, index) => (
              <div key={step} className="relative rounded border border-slate-700 bg-slate-950/70 p-4 text-center">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-sm font-semibold text-cyan-100">
                  {index + 1}
                </div>
                <div className="text-sm font-medium text-slate-100">{step}</div>
                {index < text.flow.length - 1 ? <div className="absolute right-[-13px] top-1/2 h-px w-[26px] bg-cyan-300/35" /> : null}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-slate-800 bg-slate-900/55 p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Bot className="h-4 w-4" />
            {text.bridgeTitle}
          </div>
          <p className="text-sm leading-7 text-slate-400">{text.bridgeText}</p>
          <pre className="mt-5 overflow-x-auto rounded border border-slate-800 bg-slate-950/80 p-4 text-xs text-cyan-100">
{`window.FactoryTaktAgent.getSnapshot()
window.FactoryTaktAgent.runCommand({ type: 'start' })
window.FactoryTaktAgent.runCommand({ type: 'runBackgroundSimulation' })`}
          </pre>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-8 pb-12">
        <article className="rounded-md border border-slate-800 bg-slate-900/55 p-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Factory className="h-4 w-4" />
            {text.exampleTitle}
          </div>
          <VisualStrip />
        </article>
      </section>
    </main>
  );
}

function FeatureIcon({ index }: { index: number }) {
  const icons = [Factory, Cable, Gauge, Bot];
  const Icon = icons[index] ?? Activity;
  return (
    <div className="grid h-10 w-10 place-items-center rounded border border-cyan-300/24 bg-cyan-300/10 text-cyan-100">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function HeroDiagram() {
  return (
    <div className="relative h-[300px] rounded-lg border border-slate-800 bg-slate-950/72 p-5 shadow-2xl shadow-black/30">
      <div className="absolute inset-0 industrial-grid opacity-35" />
      <div className="relative grid h-full grid-cols-[120px_1fr_120px] items-center gap-5">
        <MiniNode label="SRC" tone="cyan" />
        <div className="relative h-full">
          <div className="absolute left-0 right-0 top-[74px] h-2 rounded bg-cyan-300/20">
            <span className="absolute left-[18%] top-[-3px] h-3 w-3 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(34,211,238,.7)]" />
            <span className="absolute left-[46%] top-[-3px] h-3 w-3 rounded-full bg-cyan-200/80" />
            <span className="absolute left-[78%] top-[-3px] h-3 w-3 rounded-full bg-cyan-200/60" />
          </div>
          <div className="absolute left-0 right-0 bottom-[74px] h-2 rounded bg-violet-300/22">
            <span className="absolute left-[30%] top-[-3px] h-3 w-3 rounded-full bg-violet-200 shadow-[0_0_18px_rgba(167,139,250,.7)]" />
            <span className="absolute left-[64%] top-[-3px] h-3 w-3 rounded-full bg-violet-200/70" />
          </div>
          <div className="absolute left-1/2 top-9 h-[222px] w-px bg-slate-700" />
          <MiniNode className="absolute left-[32%] top-8" label="PROC" tone="green" />
          <MiniNode className="absolute left-[32%] bottom-8" label="ARM" tone="violet" />
        </div>
        <MiniNode label="END" tone="emerald" />
      </div>
    </div>
  );
}

function MiniNode({ label, tone, className = '' }: { label: string; tone: 'cyan' | 'green' | 'violet' | 'emerald'; className?: string }) {
  const toneClass = {
    cyan: 'border-cyan-300/40 text-cyan-100',
    green: 'border-emerald-300/40 text-emerald-100',
    violet: 'border-violet-300/40 text-violet-100',
    emerald: 'border-emerald-300/40 text-emerald-100',
  }[tone];
  return (
    <div className={`${className} rounded-md border bg-slate-950/88 p-3 shadow-xl shadow-black/25 ${toneClass}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-current" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="h-1.5 rounded bg-slate-800">
        <div className="h-full w-2/3 rounded bg-current opacity-70" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        <span className="h-1 rounded bg-slate-700" />
        <span className="h-1 rounded bg-slate-700" />
        <span className="h-1 rounded bg-slate-700" />
      </div>
    </div>
  );
}

function VisualStrip() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded border border-slate-800 bg-slate-950/70 p-4">
        <SlidersHorizontal className="mb-3 h-5 w-5 text-cyan-100" />
        <div className="space-y-2">
          <div className="h-2 rounded bg-cyan-300/70" />
          <div className="h-2 w-4/5 rounded bg-emerald-300/60" />
          <div className="h-2 w-2/3 rounded bg-violet-300/55" />
        </div>
      </div>
      <div className="rounded border border-slate-800 bg-slate-950/70 p-4">
        <Database className="mb-3 h-5 w-5 text-cyan-100" />
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 20 }).map((_, index) => (
            <span key={index} className={`h-4 rounded-sm ${index < 14 ? 'bg-cyan-300/55' : 'bg-slate-700'}`} />
          ))}
        </div>
      </div>
      <div className="rounded border border-slate-800 bg-slate-950/70 p-4">
        <PackageCheck className="mb-3 h-5 w-5 text-cyan-100" />
        <div className="flex items-end gap-2">
          {[36, 70, 48, 88, 58].map((height) => (
            <span key={height} className="w-full rounded-t bg-cyan-300/45" style={{ height }} />
          ))}
        </div>
      </div>
    </div>
  );
}
