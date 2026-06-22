import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  Cable,
  CheckCircle2,
  Database,
  ExternalLink,
  Factory,
  FileJson,
  GitBranch,
  Gauge,
  Layers3,
  LockKeyhole,
  Play,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useFactoryStore } from '../../store/factoryStore';

interface ShowcasePageProps {
  onLoadTemplate: () => void;
  onOpenSimulator: () => void;
}

const repoUrl = 'https://github.com/Felix-Zuo/factory-takt-simulator';

const zh = {
  eyebrow: 'PUBLIC PRODUCT SHOWCASE',
  title: 'Factory Takt Simulator',
  subtitle:
    '通用离散制造产线节拍仿真工作台。用可视化工序图表达流程、缓存、连线、机械手搬运和节拍逻辑，帮助在改线前评估能力、瓶颈和交付风险。',
  primaryAction: '进入工作台',
  secondaryAction: '加载通用模板',
  repoAction: '查看 GitHub',
  previewAlt: 'Factory Takt Simulator 工作台截图',
  trustBadges: ['本地优先', '合成示例数据', 'CI 验证', '可桌面封装'],
  stats: [
    ['模型范围', '工序图 + 节拍 + 物流'],
    ['运行方式', '实时仿真 / 后台仿真'],
    ['数据边界', '本地 JSON 与导出报告'],
    ['公开版本', '0.6.x 产品化路线'],
  ],
  capabilitiesTitle: '产品能力',
  capabilities: [
    ['可组合建模', 'Process A/B/C、缓存、合流、检测、装配和包装模块可以自由连线，适合不同离散制造流程。'],
    ['物流约束', '连线记录运输时间、在途容量、批量、缓存和路线形态，机械手按取料、移动、放料、返回阶段运行。'],
    ['节拍判断', '综合节拍会计入加工时间、批量、稼动率、良率、修整和耗材切换，用于识别瓶颈。'],
    ['报告交付', '可记录运行结果，导出场景、CSV 记录和仿真报告，方便把改线判断沉淀为可复查材料。'],
  ],
  workflowTitle: '工作流',
  workflow: [
    ['建模', '拖入通用工序模块并建立输入输出关系。'],
    ['配置', '调整节拍、缓存、分流、合流和搬运约束。'],
    ['仿真', '运行实时动画或后台目标产出仿真。'],
    ['分析', '检查瓶颈、等待、阻塞、利用率和产能。'],
    ['交付', '导出报告、场景 JSON 和运行记录。'],
  ],
  productSurfaceTitle: '产品界面',
  productSurface: [
    ['产线沙盘', '可视化工序、端口、连线和物料流动，适合快速讨论流程结构。'],
    ['参数面板', '把设备、连线、端口规则和节拍设置集中到右侧面板，减少来回切换。'],
    ['运营记录', '底部统计和后台仿真报告让方案对比有可追溯依据。'],
  ],
  qualityTitle: '质量与公开边界',
  quality: [
    ['自动验证', '构建、Lint、生产依赖审计、维护性检查和浏览器 smoke test 已纳入 GitHub Actions。'],
    ['安全边界', '公开仓库只保留合成模板，不提交真实客户路线、机台号、人员、产量目标或原始工厂文件。'],
    ['本地优先', '应用默认在浏览器或桌面壳内运行，不依赖远端服务，也不自动上传场景数据。'],
  ],
  integrationTitle: '集成接口',
  integrationText:
    '浏览器侧保留 FactoryTaktAgent，本地脚本、桌面封装或 AI 助手可以读取状态、导入方案、启动仿真并收集报告。',
  roadmapTitle: '公开路线图',
  roadmap: [
    ['0.6.x', '公开产品化、通用示例、CI、文档和展示页。'],
    ['0.7.x', '场景对比、转运规则解释、报告元数据和建模深度。'],
    ['0.8.x', '单元测试、导入 schema 校验、模块拆分和键盘可访问性。'],
  ],
  docsTitle: '工程资料',
  docs: [
    ['Architecture', `${repoUrl}/blob/main/docs/ARCHITECTURE.md`],
    ['Quality model', `${repoUrl}/blob/main/docs/QUALITY.md`],
    ['Roadmap', `${repoUrl}/blob/main/docs/ROADMAP.md`],
  ],
};

const en = {
  eyebrow: 'PUBLIC PRODUCT SHOWCASE',
  title: 'Factory Takt Simulator',
  subtitle:
    'A generic takt simulation workstation for modular discrete-manufacturing lines. Model processes, buffers, transfer routes, loader arms, and takt logic before changing a line.',
  primaryAction: 'Open Workbench',
  secondaryAction: 'Load Template',
  repoAction: 'View GitHub',
  previewAlt: 'Factory Takt Simulator workbench screenshot',
  trustBadges: ['Local-first', 'Synthetic examples', 'CI verified', 'Desktop-ready'],
  stats: [
    ['Model scope', 'Process graph + takt + flow'],
    ['Run modes', 'Live / background simulation'],
    ['Data boundary', 'Local JSON and reports'],
    ['Public version', '0.6.x productization'],
  ],
  capabilitiesTitle: 'Product Capabilities',
  capabilities: [
    ['Composable Modeling', 'Process A/B/C, buffer, merge, inspection, assembly, and packing modules can be connected into many discrete workflows.'],
    ['Transfer Constraints', 'Routes track travel time, in-transit capacity, batch size, buffer rules, and route shape. Loader arms run pick, move, place, and return phases.'],
    ['Takt Analysis', 'Composite takt can include process time, batch size, uptime, yield, dressing, and consumable changes for bottleneck review.'],
    ['Report Delivery', 'Runs can be captured and exported as scenarios, CSV records, and simulation reports for reviewable line-change decisions.'],
  ],
  workflowTitle: 'Operating Workflow',
  workflow: [
    ['Model', 'Place generic process modules and connect input/output relationships.'],
    ['Configure', 'Tune takt, buffers, split/merge behavior, and transfer constraints.'],
    ['Simulate', 'Run live animation or background target-output simulation.'],
    ['Analyze', 'Review bottlenecks, waiting, blocking, utilization, and capacity.'],
    ['Deliver', 'Export reports, scenario JSON, and run records.'],
  ],
  productSurfaceTitle: 'Product Surface',
  productSurface: [
    ['Line Sandbox', 'Visual processes, ports, routes, and material movement make the flow structure easy to inspect.'],
    ['Parameter Panel', 'Device, route, port-rule, and takt settings stay in one focused editing surface.'],
    ['Operations Records', 'Telemetry and background reports make scenario comparison traceable.'],
  ],
  qualityTitle: 'Quality And Public Boundary',
  quality: [
    ['Automated Gates', 'Build, lint, production dependency audit, maintainability check, and browser smoke test run in GitHub Actions.'],
    ['Data Safety', 'The public repo contains synthetic templates only. Real customer routes, machine IDs, operators, targets, and raw factory files stay out.'],
    ['Local-first', 'The app runs in the browser or desktop shell without a remote service and does not upload scenario data by default.'],
  ],
  integrationTitle: 'Integration Bridge',
  integrationText:
    'The browser-side FactoryTaktAgent lets local scripts, desktop wrappers, or AI assistants read state, import scenarios, start simulation, and collect reports.',
  roadmapTitle: 'Public Roadmap',
  roadmap: [
    ['0.6.x', 'Public productization, generic examples, CI, documentation, and showcase page.'],
    ['0.7.x', 'Scenario comparison, transfer-rule explainability, report metadata, and modeling depth.'],
    ['0.8.x', 'Unit tests, import schema validation, module splits, and keyboard accessibility.'],
  ],
  docsTitle: 'Engineering Notes',
  docs: [
    ['Architecture', `${repoUrl}/blob/main/docs/ARCHITECTURE.md`],
    ['Quality model', `${repoUrl}/blob/main/docs/QUALITY.md`],
    ['Roadmap', `${repoUrl}/blob/main/docs/ROADMAP.md`],
  ],
};

const capabilityIcons = [Layers3, Cable, Gauge, FileJson];
const surfaceIcons = [Factory, SlidersHorizontal, BarChart3];
const qualityIcons = [CheckCircle2, ShieldCheck, LockKeyhole];

export function ShowcasePage({ onLoadTemplate, onOpenSimulator }: ShowcasePageProps) {
  const settings = useFactoryStore((state) => state.settings);
  const text = settings.language === 'zh-CN' ? zh : en;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 industrial-grid opacity-30" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:py-12">
          <div className="min-w-0">
            <div className="mb-4 text-xs font-semibold uppercase text-cyan-200">{text.eyebrow}</div>
            <h2 className="max-w-4xl text-4xl font-semibold leading-tight text-slate-50 md:text-5xl">{text.title}</h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">{text.subtitle}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {text.trustBadges.map((badge) => (
                <span key={badge} className="rounded border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-xs text-cyan-100">
                  {badge}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="inline-flex h-10 items-center gap-2 rounded border border-cyan-300/40 bg-cyan-300/14 px-4 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/20"
                onClick={onOpenSimulator}
              >
                <Play className="h-4 w-4" />
                {text.primaryAction}
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded border border-emerald-300/35 bg-emerald-300/12 px-4 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/18"
                onClick={onLoadTemplate}
              >
                <Workflow className="h-4 w-4" />
                {text.secondaryAction}
              </button>
              <a
                className="inline-flex h-10 items-center gap-2 rounded border border-slate-700 bg-slate-900/70 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
                href={repoUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
                {text.repoAction}
              </a>
            </div>
          </div>
          <ProductPreview alt={text.previewAlt} />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-3 px-5 py-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {text.stats.map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-800 bg-slate-900/55 p-4">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-2 text-sm font-semibold text-slate-100">{value}</div>
          </div>
        ))}
      </section>

      <ShowcaseSection title={text.capabilitiesTitle} icon={<Boxes className="h-4 w-4" />}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {text.capabilities.map(([title, body], index) => {
            const Icon = capabilityIcons[index] ?? Activity;
            return <InfoCard key={title} icon={<Icon className="h-5 w-5" />} title={title} body={body} />;
          })}
        </div>
      </ShowcaseSection>

      <ShowcaseSection title={text.workflowTitle} icon={<Route className="h-4 w-4" />}>
        <div className="grid gap-3 md:grid-cols-5">
          {text.workflow.map(([title, body], index) => (
            <div key={title} className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
              <div className="grid h-9 w-9 place-items-center rounded border border-cyan-300/25 bg-cyan-300/10 text-sm font-semibold text-cyan-100">
                {index + 1}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-50">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection title={text.productSurfaceTitle} icon={<Factory className="h-4 w-4" />}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
          <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-900/55">
            <img src="./showcase/screenshots/running-workbench.png" alt={text.previewAlt} className="h-full min-h-[260px] w-full object-cover" />
          </div>
          <div className="grid gap-4">
            {text.productSurface.map(([title, body], index) => {
              const Icon = surfaceIcons[index] ?? Database;
              return <InfoCard key={title} icon={<Icon className="h-5 w-5" />} title={title} body={body} compact />;
            })}
          </div>
        </div>
      </ShowcaseSection>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.72fr)]">
        <article className="rounded-md border border-slate-800 bg-slate-900/55 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Bot className="h-4 w-4" />
            {text.integrationTitle}
          </div>
          <p className="text-sm leading-7 text-slate-400">{text.integrationText}</p>
          <pre className="mt-5 overflow-x-auto rounded border border-slate-800 bg-slate-950/80 p-4 text-xs leading-6 text-cyan-100">
{`window.FactoryTaktAgent.getSnapshot()
window.FactoryTaktAgent.runCommand({ type: 'createFullLineExample' })
window.FactoryTaktAgent.runCommand({ type: 'runBackgroundSimulation' })`}
          </pre>
        </article>

        <article className="rounded-md border border-slate-800 bg-slate-900/55 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <GitBranch className="h-4 w-4" />
            {text.roadmapTitle}
          </div>
          <div className="space-y-3">
            {text.roadmap.map(([title, body]) => (
              <div key={title} className="rounded border border-slate-800 bg-slate-950/68 p-3">
                <div className="text-sm font-semibold text-slate-100">{title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">{body}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <ShowcaseSection title={text.qualityTitle} icon={<ShieldCheck className="h-4 w-4" />} bottom>
        <div className="grid gap-4 md:grid-cols-3">
          {text.quality.map(([title, body], index) => {
            const Icon = qualityIcons[index] ?? CheckCircle2;
            return <InfoCard key={title} icon={<Icon className="h-5 w-5" />} title={title} body={body} />;
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {text.docs.map(([title, href]) => (
            <a
              key={title}
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-700 bg-slate-950/70 px-3 text-xs font-semibold text-slate-100 transition hover:border-cyan-300/45 hover:text-cyan-100"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {title}
            </a>
          ))}
        </div>
      </ShowcaseSection>
    </main>
  );
}

function ShowcaseSection({
  bottom = false,
  children,
  icon,
  title,
}: {
  bottom?: boolean;
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className={`mx-auto max-w-7xl px-5 sm:px-8 ${bottom ? 'pb-12' : 'pb-8'}`}>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-100">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function InfoCard({ body, compact = false, icon, title }: { body: string; compact?: boolean; icon: ReactNode; title: string }) {
  return (
    <article className={`rounded-md border border-slate-800 bg-slate-900/55 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="grid h-10 w-10 place-items-center rounded border border-cyan-300/24 bg-cyan-300/10 text-cyan-100">{icon}</div>
      <h3 className="mt-4 text-sm font-semibold text-slate-50">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{body}</p>
    </article>
  );
}

function ProductPreview({ alt }: { alt: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-900/55 shadow-2xl shadow-black/28">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 bg-slate-950/76 px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
        </div>
        <div className="text-xs text-slate-500">Factory Takt Simulator</div>
      </div>
      <img src="./showcase/screenshots/line-overview.png" alt={alt} className="aspect-[16/10] w-full object-cover" />
      <div className="grid grid-cols-3 border-t border-slate-800 bg-slate-950/70">
        {[
          ['Capacity', '278/h'],
          ['Balance', '86%'],
          ['Risk', 'Medium'],
        ].map(([label, value]) => (
          <div key={label} className="border-r border-slate-800 px-4 py-3 last:border-r-0">
            <div className="text-[11px] text-slate-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
