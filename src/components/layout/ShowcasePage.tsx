import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ExternalLink,
  Factory,
  GitBranch,
  Layers3,
  LockKeyhole,
  Network,
  Play,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
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
  eyebrow: '工业数字孪生 · 节拍与实时状态',
  title: 'Factory Takt Simulator',
  subtitle:
    '把离散制造仿真、PLC/MES 实时状态和受限工程分析放在同一张画板。既能用合成场景验证节拍，也为 Ignition、Sepasoft、OPC UA 与 Sparkplug B 现场接入保留清晰边界。',
  primaryAction: '进入工作台',
  secondaryAction: '加载通用模板',
  repoAction: '查看 GitHub',
  heroAlt: 'Factory Takt Simulator 产线沙盘首屏',
  workbenchAlt: 'Factory Takt Simulator 运行工作台',
  proof: [`v${APP_VERSION}`, 'Industrial Gateway', 'AI 成本受控', '真实命令默认关闭'],
  heroStats: [
    ['建模', '工序与物流'],
    ['现场', 'PLC / MES 状态'],
    ['分析', '报告 + 受限 AI'],
  ],
  metricStrip: [
    ['1.0', '统一工业状态契约'],
    ['500', '单快照资产上限'],
    ['700', 'AI 默认输出上限'],
    ['OFF', '真实命令默认状态'],
  ],
  positioningTitle: '从方案仿真走到现场影子运行',
  positioning:
    '同一套节点既可以跑确定性节拍仿真，也可以绑定网关归一化后的机床动作、传感器、阀反馈、PLC 模式和报警。现场信号只负责呈现，不会在后台悄悄改写仿真参数。',
  capabilitiesTitle: '从路线到决策依据',
  capabilities: [
    ['建立通用产线模型', '拖入工序、缓存、检测、装配和搬运模块，用端口规则表达分流、合流和返回段。'],
    ['绑定实时设备状态', '把 PLC 模式、动作阶段、传感器质量、阀/电机指令与反馈映射到同一节点。'],
    ['归一化报警与命令', '报警只读进入画板；命令独立走白名单、预演、操作员令牌和二次确认。'],
    ['深入但受限地分析', 'DeepSeek V4 Flash 只接收压缩后的当前报告与状态，回答、次数、输出和每日 Token 都有上限。'],
  ] satisfies TextBlock[],
  liveTitle: '看见动作，也看见信号质量与联锁边界',
  liveEyebrow: 'LIVE DIGITAL TWIN',
  liveLead:
    '实时控制台把资产、活动报警、工程问答和接入配置放在画板侧边。节点只显示必要状态，详细 Tag 路径与执行器反馈在需要时展开，不牺牲产线整体可读性。',
  liveAlt: 'Factory Takt Simulator 实时数字孪生控制台',
  livePoints: [
    ['机床动作', '等待、上料、夹紧、加工、检测、转运、下料、保持、维护和故障。'],
    ['现场信号', '传感器值、OPC 质量、时间戳、执行器指令/反馈和联锁状态。'],
    ['MES 上下文', '按 ISA-95 设备层级预留工序定义、执行响应、物料批次和质量结果映射。'],
  ] satisfies TextBlock[],
  workflowTitle: '从想法到报告的闭环',
  workflowEyebrow: '标准工作流',
  workflow: [
    ['1. 建模', '用通用工序与物流规则建立可运行网络。'],
    ['2. 映射', '按设备层级绑定 OPC/MES Tag 与节点 ID。'],
    ['3. 影子运行', '先只读接收状态，核对动作、质量和报警语义。'],
    ['4. 分析', '对比节拍报告、实时症状和受限 AI 解释。'],
    ['5. 验证', '经过现场测试与安全审查后再考虑命令适配。'],
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
  bridgeTitle: '明确、可测试的工业接入契约',
  bridgeText: '网关接收有界的 1.0 快照，经过字段、数量、引用和来源校验后再通过 SSE 推送。浏览器侧 FactoryTaktAgent 同时暴露仿真与只读孪生快照，但不包含 PLC 写入能力。',
  roadmapTitle: '产品演进',
  roadmap: [
    ['0.8.0', '工业网关、实时资产状态、报警流、DeepSeek 受限分析和新版产品展示。'],
    ['现场适配', '按工厂设备层级完成 Tag 映射、证书、质量码、报警语义与影子运行验证。'],
    ['持续改进', '场景对比、历史趋势、更多 MES 适配器和键盘可访问性。'],
  ] satisfies TextBlock[],
  docsTitle: '工程资料',
  docs: [
    ['Architecture', `${repoUrl}/blob/main/docs/ARCHITECTURE.md`],
    ['Quality model', `${repoUrl}/blob/main/docs/QUALITY.md`],
    ['Roadmap', `${repoUrl}/blob/main/docs/ROADMAP.md`],
    ['Industrial integration', `${repoUrl}/blob/main/docs/INDUSTRIAL_INTEGRATION.md`],
    ['AI policy', `${repoUrl}/blob/main/docs/AI_ASSISTANT.md`],
    ['Releases', releaseUrl],
  ],
};

const en = {
  eyebrow: 'INDUSTRIAL DIGITAL TWIN · TAKT & LIVE STATE',
  title: 'Factory Takt Simulator',
  subtitle:
    'One canvas for discrete-manufacturing simulation, live PLC/MES state, and bounded engineering analysis. Validate takt with synthetic scenarios, then connect through defined Ignition, Sepasoft, OPC UA, and Sparkplug B boundaries.',
  primaryAction: 'Open Workbench',
  secondaryAction: 'Load Template',
  repoAction: 'View GitHub',
  heroAlt: 'Factory Takt Simulator line sandbox hero',
  workbenchAlt: 'Factory Takt Simulator running workbench',
  proof: [`v${APP_VERSION}`, 'Industrial Gateway', 'Bounded AI cost', 'Commands off by default'],
  heroStats: [
    ['Model', 'Process + flow'],
    ['Plant', 'PLC / MES state'],
    ['Analyze', 'Reports + bounded AI'],
  ],
  metricStrip: [
    ['1.0', 'normalized twin contract'],
    ['500', 'assets per snapshot'],
    ['700', 'default AI output cap'],
    ['OFF', 'physical commands by default'],
  ],
  positioningTitle: 'Move from scenario simulation to read-only shadow operation.',
  positioning:
    'The same nodes can run deterministic takt simulation and bind normalized machine actions, sensors, valve feedback, PLC modes, and alarms. Live signals remain presentational and never rewrite simulation parameters silently.',
  capabilitiesTitle: 'From route to decision evidence',
  capabilities: [
    ['Build a generic line model', 'Connect process, buffer, inspection, assembly, and transfer modules with explicit routing rules.'],
    ['Bind live equipment state', 'Map PLC mode, action phase, sensor quality, and valve or motor command/feedback to each node.'],
    ['Normalize alarms and commands', 'Alarms enter read-only; commands use a separate allowlist, preview, operator token, and exact confirmation.'],
    ['Analyze deeply within limits', 'DeepSeek V4 Flash receives only compact current evidence, with bounded answers, calls, output, and daily tokens.'],
  ] satisfies TextBlock[],
  liveTitle: 'See machine action, signal quality, and the interlock boundary.',
  liveEyebrow: 'LIVE DIGITAL TWIN',
  liveLead:
    'The live console keeps assets, active alarms, engineering questions, and connection settings beside the canvas. Nodes show only essential state; tag paths and actuator feedback expand on demand without obscuring the line.',
  liveAlt: 'Factory Takt Simulator live digital twin console',
  livePoints: [
    ['Machine action', 'Waiting, load, clamp, process, inspect, transfer, unload, hold, service, and fault.'],
    ['Plant signals', 'Sensor values, OPC quality, timestamps, actuator command/feedback, and interlock state.'],
    ['MES context', 'ISA-95-oriented mappings for equipment hierarchy, operations, responses, material lots, and quality results.'],
  ] satisfies TextBlock[],
  workflowTitle: 'From idea to report',
  workflowEyebrow: 'STANDARD WORKFLOW',
  workflow: [
    ['1. Model', 'Build a runnable network with generic process and flow rules.'],
    ['2. Map', 'Bind OPC/MES tags to stable equipment and node IDs.'],
    ['3. Shadow', 'Receive read-only state and reconcile actions, quality, and alarms.'],
    ['4. Analyze', 'Compare takt reports, runtime symptoms, and bounded AI explanations.'],
    ['5. Validate', 'Complete site and safety testing before considering command adapters.'],
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
  bridgeTitle: 'A clear, testable industrial contract',
  bridgeText:
    'The gateway accepts bounded 1.0 snapshots, validates fields, counts, references, and sources, then streams them over SSE. FactoryTaktAgent exposes simulation and read-only twin snapshots without any PLC write method.',
  roadmapTitle: 'Product Evolution',
  roadmap: [
    ['0.8.0', 'Industrial gateway, live asset state, alarm flow, bounded DeepSeek analysis, and an upgraded product surface.'],
    ['Site adaptation', 'Validate equipment mapping, certificates, quality codes, alarm semantics, and shadow operation for each plant.'],
    ['Continuous', 'Scenario comparison, history trends, more MES adapters, and keyboard accessibility.'],
  ] satisfies TextBlock[],
  docsTitle: 'Engineering Notes',
  docs: [
    ['Architecture', `${repoUrl}/blob/main/docs/ARCHITECTURE.md`],
    ['Quality model', `${repoUrl}/blob/main/docs/QUALITY.md`],
    ['Roadmap', `${repoUrl}/blob/main/docs/ROADMAP.md`],
    ['Industrial integration', `${repoUrl}/blob/main/docs/INDUSTRIAL_INTEGRATION.md`],
    ['AI policy', `${repoUrl}/blob/main/docs/AI_ASSISTANT.md`],
    ['Releases', releaseUrl],
  ],
};

const capabilityIcons = [Layers3, RadioTower, AlertTriangle, Bot];
const surfaceIcons = [Factory, SlidersHorizontal, BarChart3];
const liveIcons = [Activity, AlertTriangle, Network];
const evidenceIcons = [CheckCircle2, ShieldCheck, LockKeyhole];

export function ShowcasePage({ onLoadTemplate, onOpenSimulator }: ShowcasePageProps) {
  const settings = useFactoryStore((state) => state.settings);
  const text = settings.language === 'zh-CN' ? zh : en;
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ container: scrollContainerRef });
  const scrollScaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.25 });

  return (
    <main ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-[#f5f7fb] text-slate-950">
      <motion.div
        data-testid="showcase-scroll-progress"
        className="fixed inset-x-0 top-0 z-[70] h-0.5 origin-left bg-cyan-400"
        style={{ scaleX: scrollScaleX }}
      />
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

      <Section dark eyebrow={text.liveEyebrow} title={text.liveTitle} body={text.liveLead}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,.88fr)]">
          <div className="overflow-hidden rounded-md border border-slate-700 bg-slate-950 shadow-2xl shadow-black/25">
            <img
              src="./showcase/industrial-twin-demo.gif"
              alt={text.liveAlt}
              className="h-full w-full object-cover motion-reduce:hidden"
              loading="lazy"
            />
            <img
              src="./showcase/screenshots/industrial-twin-console.png"
              alt={text.liveAlt}
              className="hidden h-full w-full object-cover motion-reduce:block"
              loading="lazy"
            />
          </div>
          <div className="grid gap-3">
            {text.livePoints.map(([title, body], index) => {
              const Icon = liveIcons[index] ?? Activity;
              return <SurfaceRow key={title} icon={<Icon className="h-5 w-5" />} title={title} body={body} />;
            })}
          </div>
        </div>
      </Section>

      <Section eyebrow={text.surfaceEyebrow} title={text.surfaceTitle} body={text.surfaceLead}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,.88fr)]">
          <div className="overflow-hidden rounded-md border border-slate-300 bg-slate-950 shadow-xl shadow-slate-900/12">
            <img src="./showcase/screenshots/running-workbench.png" alt={text.workbenchAlt} className="w-full object-cover" />
          </div>
          <div className="grid gap-3">
            {text.surfaces.map(([title, body], index) => {
              const Icon = surfaceIcons[index] ?? Factory;
              return <FeatureColumn key={title} icon={<Icon className="h-5 w-5" />} title={title} body={body} />;
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
GET  /api/industrial/stream
POST /api/industrial/events
POST /api/ai/assist`}
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
  const reduceMotion = useReducedMotion();
  return (
    <section className="relative isolate min-h-[620px] overflow-hidden bg-slate-950 text-white">
      <motion.img
        src="./showcase/screenshots/line-overview.png"
        alt={text.heroAlt}
        className="absolute inset-x-0 -top-14 h-[calc(100%+3.5rem)] w-full object-cover opacity-[0.72]"
        initial={reduceMotion ? false : { scale: 1.035 }}
        animate={reduceMotion ? undefined : { scale: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.94)_0%,rgba(2,6,23,.70)_42%,rgba(2,6,23,.18)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950 to-transparent" />
      <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-between px-5 py-10 sm:px-8 lg:py-14">
        <motion.div
          className="max-w-4xl"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
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
        </motion.div>

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
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      className={`${dark ? 'bg-slate-950 text-slate-100' : 'bg-[#f5f7fb] text-slate-950'} border-b border-slate-200/70`}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-7 max-w-3xl">
          <div className={`mb-3 text-xs font-semibold uppercase ${dark ? 'text-cyan-200' : 'text-cyan-700'}`}>{eyebrow}</div>
          <h3 className={`text-2xl font-semibold leading-tight md:text-4xl ${dark ? 'text-white' : 'text-slate-950'}`}>{title}</h3>
          {body ? <p className={`mt-4 text-sm leading-7 md:text-base ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{body}</p> : null}
        </div>
        {children}
      </div>
    </motion.section>
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
