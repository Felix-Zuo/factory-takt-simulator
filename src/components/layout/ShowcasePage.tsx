import {
  BarChart3,
  Bot,
  Cable,
  CheckCircle2,
  ExternalLink,
  Factory,
  FileJson,
  Gauge,
  GitBranch,
  Layers3,
  LockKeyhole,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useFactoryStore } from '../../store/factoryStore';
import { APP_VERSION } from '../../version';

interface ShowcasePageProps {
  onLoadTemplate: () => void;
  onOpenSimulator: () => void;
}

type TextBlock = [string, string];

const repoUrl = 'https://github.com/Felix-Zuo/factory-takt-simulator';
const releaseUrl = `${repoUrl}/releases`;

const zh = {
  eyebrow: '离散制造 · 节拍与物流仿真',
  title: 'Factory Takt Simulator',
  subtitle:
    '面向离散制造的通用节拍仿真工作台。先把工序、缓存、搬运和节拍放进可视化沙盘，再决定是否改线、扩产或调整瓶颈工序。',
  primaryAction: '进入工作台',
  secondaryAction: '加载通用模板',
  repoAction: '查看 GitHub',
  heroAlt: 'Factory Takt Simulator 产线沙盘首屏',
  workbenchAlt: 'Factory Takt Simulator 运行工作台',
  proof: [`v${APP_VERSION}`, 'CI / Smoke 通过', 'Apache-2.0', '仅使用合成数据'],
  heroStats: [
    ['模型', '工序网络'],
    ['物流', '缓存与搬运'],
    ['输出', '报告与记录'],
  ],
  metricStrip: [
    ['43', '合成示例模块'],
    ['52', '物料转运关系'],
    ['2', '实时 / 后台模式'],
    ['Local', '数据保留在本地'],
  ],
  positioningTitle: '先验证产能假设，再改动真实产线',
  positioning:
    '把工序节拍、良率、缓冲区、转运时间和分支规则放进同一张可运行网络。方案可以先在合成场景中验证，再用产能、等待、阻塞和瓶颈结果支持工程决策。',
  capabilitiesTitle: '从路线到决策依据',
  capabilities: [
    ['快速搭建路线', '拖入工序模块，用输入输出端口建立分流、合流、缓存、检测、装配和包装路线。'],
    ['约束物流规则', '为连线设置在途容量、运输时间、批量、缓存和机械手四段动作，让瓶颈判断更接近真实节拍。'],
    ['运行仿真反馈', '实时动画和后台仿真会累计等待、阻塞、维护、利用率、产能和工序输出。'],
    ['交付可复查报告', '导出场景 JSON、CSV 记录和仿真报告，把改线判断沉淀成可审计材料。'],
  ] satisfies TextBlock[],
  workflowTitle: '从想法到报告的闭环',
  workflowEyebrow: '标准工作流',
  workflow: [
    ['1. 建模', '把不同工序抽象成模块，先验证路线结构。'],
    ['2. 配置', '输入节拍、良率、缓存、搬运和端口规则。'],
    ['3. 仿真', '用实时或后台模式跑目标时间/目标产出。'],
    ['4. 分析', '查看产能、等待、阻塞、利用率和瓶颈建议。'],
    ['5. 交付', '保存方案并导出报告、记录和公开模板。'],
  ] satisfies TextBlock[],
  surfaceTitle: '一张画布看清路线、状态与瓶颈',
  surfaceEyebrow: '工作台实景',
  surfaceLead:
    '建模、参数编辑、运行状态和结果分析保持在同一工作区。选择任意工序或连线即可检查对应约束，不必在多个页面之间来回切换。',
  surfaces: [
    ['产线沙盘', '节点、端口、连线和物料流动保持同屏可见。'],
    ['参数工作区', '设备、连线、端口规则和节拍设置集中编辑。'],
    ['运行证据', '统计栏、记录和报告让方案差异可以复查。'],
  ] satisfies TextBlock[],
  evidenceTitle: '工程决策需要可复查的依据',
  evidenceEyebrow: '可信运行',
  evidence: [
    ['质量门禁', 'Build、Lint、生产依赖审计、维护性检查和浏览器 smoke test 已纳入 GitHub Actions。'],
    ['数据边界', '公开仓库只放合成模板，不提交客户路线、机台号、人员、真实产量目标或原始工厂文件。'],
    ['本地优先', '默认在浏览器或桌面壳内运行，不依赖远端服务，也不会自动上传场景数据。'],
  ] satisfies TextBlock[],
  bridgeTitle: '可被脚本和智能体调用',
  bridgeText: '浏览器侧保留 FactoryTaktAgent，外部脚本、桌面封装或 AI 助手可以读取状态、导入方案、启动仿真并收集报告。',
  roadmapTitle: '产品演进',
  roadmap: [
    ['0.7.0', '聚焦画布、响应式遥测、场景边界校验和统一展示体验。'],
    ['下一阶段', '场景对比、转运规则解释、报告元数据和建模深度。'],
    ['持续改进', '单元测试、模块拆分和键盘可访问性。'],
  ] satisfies TextBlock[],
  docsTitle: '工程资料',
  docs: [
    ['Architecture', `${repoUrl}/blob/main/docs/ARCHITECTURE.md`],
    ['Quality model', `${repoUrl}/blob/main/docs/QUALITY.md`],
    ['Roadmap', `${repoUrl}/blob/main/docs/ROADMAP.md`],
    ['Releases', releaseUrl],
  ],
};

const en = {
  eyebrow: 'DISCRETE MANUFACTURING · TAKT & FLOW SIMULATION',
  title: 'Factory Takt Simulator',
  subtitle:
    'A generic takt simulation workstation for discrete manufacturing. Model process routes, buffers, transfer constraints, and takt logic before changing a line.',
  primaryAction: 'Open Workbench',
  secondaryAction: 'Load Template',
  repoAction: 'View GitHub',
  heroAlt: 'Factory Takt Simulator line sandbox hero',
  workbenchAlt: 'Factory Takt Simulator running workbench',
  proof: [`v${APP_VERSION}`, 'CI / smoke verified', 'Apache-2.0', 'Synthetic data only'],
  heroStats: [
    ['Model', 'Process graph'],
    ['Flow', 'Buffers + transfer'],
    ['Output', 'Reports + records'],
  ],
  metricStrip: [
    ['43', 'synthetic modules'],
    ['52', 'transfer routes'],
    ['2', 'live / background modes'],
    ['Local', 'data stays on device'],
  ],
  positioningTitle: 'Validate the capacity hypothesis before changing the line.',
  positioning:
    'Put takt, yield, buffers, transfer time, and branching rules into one runnable network. Test the synthetic scenario first, then use capacity, waiting, blocking, and bottleneck evidence to support an engineering decision.',
  capabilitiesTitle: 'From route to decision evidence',
  capabilities: [
    ['Build routes quickly', 'Drop process modules and connect ports for split, merge, buffer, inspection, assembly, and packing flows.'],
    ['Constrain material flow', 'Tune in-transit capacity, travel time, batch behavior, buffers, and loader-arm phases for realistic bottleneck review.'],
    ['Run simulation feedback', 'Live and background simulation track waiting, blocking, maintenance, utilization, capacity, and stage output.'],
    ['Deliver reviewable reports', 'Export scenario JSON, CSV records, and simulation reports so line-change decisions remain inspectable.'],
  ] satisfies TextBlock[],
  workflowTitle: 'From idea to report',
  workflowEyebrow: 'STANDARD WORKFLOW',
  workflow: [
    ['1. Model', 'Represent the process route before changing the line.'],
    ['2. Configure', 'Set takt, yield, buffers, transfer, and port rules.'],
    ['3. Simulate', 'Run live or background checks by time or target output.'],
    ['4. Analyze', 'Review capacity, waiting, blocking, utilization, and bottlenecks.'],
    ['5. Deliver', 'Save the scenario and export reports, records, and templates.'],
  ] satisfies TextBlock[],
  surfaceTitle: 'See the route, state, and bottleneck on one canvas',
  surfaceEyebrow: 'WORKBENCH IN PRACTICE',
  surfaceLead:
    'Modeling, parameter editing, run state, and analysis stay in one workspace. Select any process or route to inspect its constraints without moving between separate screens.',
  surfaces: [
    ['Line sandbox', 'Nodes, ports, routes, and material movement remain visible together.'],
    ['Parameter workspace', 'Device, route, port-rule, and takt settings stay in one focused edit area.'],
    ['Run evidence', 'Telemetry, records, and reports make scenario differences reviewable.'],
  ] satisfies TextBlock[],
  evidenceTitle: 'Engineering decisions need reviewable evidence',
  evidenceEyebrow: 'TRUSTED OPERATION',
  evidence: [
    ['Quality gates', 'Build, lint, production audit, maintainability check, and browser smoke test run in GitHub Actions.'],
    ['Data boundary', 'The public repo contains synthetic templates only: no customer routes, machine IDs, operators, real targets, or raw factory files.'],
    ['Local-first', 'Runs in the browser or desktop shell without a remote service and does not upload scenario data by default.'],
  ] satisfies TextBlock[],
  bridgeTitle: 'Scriptable and agent-ready',
  bridgeText:
    'The browser-side FactoryTaktAgent lets local scripts, desktop wrappers, or AI assistants read state, import scenarios, start simulation, and collect reports.',
  roadmapTitle: 'Product Evolution',
  roadmap: [
    ['0.7.0', 'Focused canvas, responsive telemetry, scenario boundary validation, and one coherent product surface.'],
    ['Next', 'Scenario comparison, transfer-rule explainability, report metadata, and modeling depth.'],
    ['Continuous', 'Unit tests, module splits, and keyboard accessibility.'],
  ] satisfies TextBlock[],
  docsTitle: 'Engineering Notes',
  docs: [
    ['Architecture', `${repoUrl}/blob/main/docs/ARCHITECTURE.md`],
    ['Quality model', `${repoUrl}/blob/main/docs/QUALITY.md`],
    ['Roadmap', `${repoUrl}/blob/main/docs/ROADMAP.md`],
    ['Releases', releaseUrl],
  ],
};

const capabilityIcons = [Layers3, Cable, Gauge, FileJson];
const surfaceIcons = [Factory, SlidersHorizontal, BarChart3];
const evidenceIcons = [CheckCircle2, ShieldCheck, LockKeyhole];

export function ShowcasePage({ onLoadTemplate, onOpenSimulator }: ShowcasePageProps) {
  const settings = useFactoryStore((state) => state.settings);
  const text = settings.language === 'zh-CN' ? zh : en;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f5f7fb] text-slate-950">
      <Hero text={text} onLoadTemplate={onLoadTemplate} onOpenSimulator={onOpenSimulator} />

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4">
          {text.metricStrip.map(([value, label]) => (
            <div key={label} className="border-b border-slate-200 py-5 odd:pr-4 even:border-l even:pl-4 lg:border-b-0 lg:border-l lg:px-5 lg:first:border-l-0">
              <div className="text-3xl font-semibold text-slate-950">{value}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <Section eyebrow={text.capabilitiesTitle} title={text.positioningTitle} body={text.positioning}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {text.capabilities.map(([title, body], index) => {
            const Icon = capabilityIcons[index] ?? Layers3;
            return <FeatureColumn key={title} icon={<Icon className="h-5 w-5" />} title={title} body={body} />;
          })}
        </div>
      </Section>

      <Section dark eyebrow={text.surfaceEyebrow} title={text.surfaceTitle} body={text.surfaceLead}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,.88fr)]">
          <div className="overflow-hidden rounded-md border border-slate-700 bg-slate-950 shadow-2xl shadow-black/25">
            <img src="./showcase/screenshots/running-workbench.png" alt={text.workbenchAlt} className="w-full object-cover" />
          </div>
          <div className="grid gap-3">
            {text.surfaces.map(([title, body], index) => {
              const Icon = surfaceIcons[index] ?? Factory;
              return <SurfaceRow key={title} icon={<Icon className="h-5 w-5" />} title={title} body={body} />;
            })}
          </div>
        </div>
      </Section>

      <Section eyebrow={text.workflowEyebrow} title={text.workflowTitle}>
        <div className="grid gap-3 md:grid-cols-5">
          {text.workflow.map(([title, body]) => (
            <article key={title} className="border-t-2 border-cyan-600 py-4 md:px-3 md:first:pl-0 md:last:pr-0">
              <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
              <p className="mt-3 text-xs leading-5 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </Section>

      <section className="bg-slate-950 text-slate-100">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.72fr)]">
          <article>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <Bot className="h-4 w-4" />
              {text.bridgeTitle}
            </div>
            <p className="text-sm leading-7 text-slate-400">{text.bridgeText}</p>
            <pre className="mt-5 overflow-x-auto rounded border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-cyan-100">
{`window.FactoryTaktAgent.getSnapshot()
window.FactoryTaktAgent.runCommand({ type: 'createFullLineExample' })
window.FactoryTaktAgent.runCommand({ type: 'runBackgroundSimulation' })`}
            </pre>
          </article>

          <article className="border-t border-slate-800 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <GitBranch className="h-4 w-4" />
              {text.roadmapTitle}
            </div>
            <div className="space-y-3">
              {text.roadmap.map(([title, body]) => (
                <div key={title} className="border-t border-slate-800 py-3 first:border-t-0 first:pt-0">
                  <div className="text-sm font-semibold text-slate-100">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{body}</div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <Section eyebrow={text.evidenceEyebrow} title={text.evidenceTitle}>
        <div className="grid gap-4 md:grid-cols-3">
          {text.evidence.map(([title, body], index) => {
            const Icon = evidenceIcons[index] ?? CheckCircle2;
            return <FeatureColumn key={title} icon={<Icon className="h-5 w-5" />} title={title} body={body} />;
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {text.docs.map(([title, href]) => (
            <a
              key={title}
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-cyan-500 hover:text-cyan-700"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {title}
            </a>
          ))}
        </div>
      </Section>
    </main>
  );
}

function Hero({
  onLoadTemplate,
  onOpenSimulator,
  text,
}: {
  onLoadTemplate: () => void;
  onOpenSimulator: () => void;
  text: typeof zh | typeof en;
}) {
  return (
    <section className="relative isolate min-h-[620px] overflow-hidden bg-slate-950 text-white">
      <img src="./showcase/screenshots/line-overview.png" alt={text.heroAlt} className="absolute inset-x-0 -top-14 h-[calc(100%+3.5rem)] w-full object-cover opacity-[0.72]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.94)_0%,rgba(2,6,23,.70)_42%,rgba(2,6,23,.18)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950 to-transparent" />
      <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-between px-5 py-10 sm:px-8 lg:py-14">
        <div className="max-w-4xl">
          <div className="mb-5 text-xs font-semibold uppercase text-cyan-200">{text.eyebrow}</div>
          <h2 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-white md:text-7xl">{text.title}</h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">{text.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="inline-flex h-11 items-center gap-2 rounded border border-cyan-200/55 bg-cyan-200 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/25 transition hover:bg-cyan-100"
              onClick={onOpenSimulator}
            >
              <Play className="h-4 w-4" />
              {text.primaryAction}
            </button>
            <button
              className="inline-flex h-11 items-center gap-2 rounded border border-emerald-200/45 bg-emerald-300/16 px-4 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/24"
              onClick={onLoadTemplate}
            >
              <Workflow className="h-4 w-4" />
              {text.secondaryAction}
            </button>
            <a
              className="inline-flex h-11 items-center gap-2 rounded border border-white/22 bg-white/8 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/14"
              href={repoUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-4 w-4" />
              {text.repoAction}
            </a>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:items-end">
          <div className="flex flex-wrap gap-2">
            {text.proof.map((badge) => (
              <span key={badge} className="rounded border border-white/18 bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-100 backdrop-blur">
                {badge}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-md border border-white/16 bg-slate-950/62 backdrop-blur">
            {text.heroStats.map(([label, value]) => (
              <div key={label} className="border-r border-white/10 px-4 py-3 last:border-r-0">
                <div className="text-[11px] uppercase text-slate-400">{label}</div>
                <div className="mt-1 text-sm font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Section({
  body,
  children,
  dark = false,
  eyebrow,
  title,
}: {
  body?: string;
  children: ReactNode;
  dark?: boolean;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className={`${dark ? 'bg-slate-950 text-slate-100' : 'bg-[#f5f7fb] text-slate-950'} border-b border-slate-200/70`}>
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-7 max-w-3xl">
          <div className={`mb-3 text-xs font-semibold uppercase ${dark ? 'text-cyan-200' : 'text-cyan-700'}`}>{eyebrow}</div>
          <h3 className={`text-2xl font-semibold leading-tight md:text-4xl ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</h3>
          {body ? <p className={`mt-4 text-sm leading-7 md:text-base ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{body}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function FeatureColumn({ body, icon, title }: { body: string; icon: ReactNode; title: string }) {
  return (
    <article className="border-t border-slate-300 py-5">
      <div className="grid h-10 w-10 place-items-center rounded border border-cyan-200 bg-cyan-50 text-cyan-700">{icon}</div>
      <h4 className="mt-5 text-sm font-semibold text-slate-950">{title}</h4>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

function SurfaceRow({ body, icon, title }: { body: string; icon: ReactNode; title: string }) {
  return (
    <article className="border-t border-slate-800 py-4 first:border-t-0 first:pt-0">
      <div className="grid h-10 w-10 place-items-center rounded border border-cyan-300/24 bg-cyan-300/10 text-cyan-100">{icon}</div>
      <h4 className="mt-5 text-sm font-semibold text-white">{title}</h4>
      <p className="mt-3 text-sm leading-6 text-slate-400">{body}</p>
    </article>
  );
}
