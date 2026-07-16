import { Bot, Check, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { buildLocalAssistantResult } from '../../lib/industrial/localAssistant';
import { requestAiAssistance } from '../../lib/industrial/gatewayClient';
import { useFactoryStore } from '../../store/factoryStore';
import { useTwinStore } from '../../store/twinStore';
import type { AiAssistantMode, AiAssistantResult, AiCanvasAction } from '../../types/industrial';

const SESSION_KEY = 'factory-takt-simulator:ai-session:v1';

const getSessionId = () => {
  const created = `fts_${crypto.randomUUID().replace(/-/g, '')}`;
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,80}$/.test(existing)) return existing;
    localStorage.setItem(SESSION_KEY, created);
  } catch {
    return created;
  }
  return created;
};

export function TwinAssistantPanel() {
  const factory = useFactoryStore();
  const twin = useTwinStore();
  const zh = factory.settings.language === 'zh-CN';
  const [mode, setMode] = useState<AiAssistantMode>('analyze');
  const [question, setQuestion] = useState(zh ? '当前瓶颈为什么成立，下一步先验证什么？' : 'Why is the current bottleneck credible, and what should I validate first?');
  const [result, setResult] = useState<AiAssistantResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<string[]>([]);
  const [sessionId] = useState(() => getSessionId());

  const ask = async () => {
    const boundedQuestion = question.trim().slice(0, 600);
    if (!boundedQuestion || busy) return;
    setBusy(true);
    setError('');
    setApplied([]);
    const localResult = () =>
      buildLocalAssistantResult({
        language: factory.settings.language,
        mode,
        question: boundedQuestion,
        summary: factory.summary,
        nodes: factory.nodes,
        snapshot: twin.snapshot,
        isRunning: factory.isRunning,
      });

    try {
      if (twin.mode !== 'gateway') {
        setResult(localResult());
        return;
      }
      const topNodes = [...factory.nodes]
        .filter((node) => node.data.params.enabled)
        .sort((a, b) => b.data.metrics.utilization - a.data.metrics.utilization)
        .slice(0, 12)
        .map((node) => ({
          id: node.id,
          name: node.data.params.deviceShortName,
          status: node.data.runtime.status,
          taktSec: Number(node.data.metrics.averageSinglePieceTakt.toFixed(2)),
          capacityPerHour: Number(node.data.metrics.theoreticalCapacityPerHour.toFixed(2)),
          utilization: Number(node.data.metrics.utilization.toFixed(3)),
          waitingSec: Math.round(node.data.metrics.totalWaitingTime),
          blockedSec: Math.round(node.data.metrics.totalBlockedTime),
        }));
      const response = await requestAiAssistance(twin.gatewayUrl, {
        mode,
        question: boundedQuestion,
        language: factory.settings.language,
        report: factory.latestReport.slice(0, 18_000),
        context: {
          elapsedSec: Math.round(factory.elapsedSec),
          isRunning: factory.isRunning,
          bottleneck: factory.summary.bottleneck,
          theoreticalCapacityPerHour: factory.summary.theoreticalCapacityPerHour,
          simulationCapacityPerHour: factory.summary.simulationCapacityPerHour,
          statusCounts: factory.summary.statusCounts,
          topNodes,
          activeAlarms: twin.snapshot.alarms.filter((alarm) => alarm.state === 'active').slice(0, 12),
        },
        sessionId,
      });
      setResult(response);
    } catch (requestError) {
      setError(
        `${requestError instanceof Error ? requestError.message : 'AI gateway unavailable'} ${
          zh ? '已切换为本地规则分析。' : 'Falling back to local rule analysis.'
        }`,
      );
      setResult(localResult());
    } finally {
      setBusy(false);
    }
  };

  const applyAction = (action: AiCanvasAction, index: number) => {
    const key = `${action.type}:${index}`;
    switch (action.type) {
      case 'focus_node':
        if (action.targetId && factory.nodes.some((node) => node.id === action.targetId)) factory.selectNode(action.targetId);
        break;
      case 'pause_simulation':
        factory.pause();
        break;
      case 'start_simulation':
        factory.start();
        break;
      case 'set_simulation_speed':
        if (typeof action.value === 'number') factory.setSpeed(Math.max(0.1, Math.min(500, action.value)));
        break;
      case 'set_process_time':
        if (action.targetId && typeof action.value === 'number' && factory.nodes.some((node) => node.id === action.targetId)) {
          factory.updateNodeParams(action.targetId, { processTimeSec: Math.max(0.1, Math.min(3600, action.value)) });
        }
        break;
      case 'run_background_analysis':
        factory.runBackgroundSimulation();
        break;
      default:
        return;
    }
    setApplied((items) => [...items, key]);
  };

  return (
    <div className="p-3">
      <div className="border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
          <Bot className="h-4 w-4 text-cyan-200" />
          {zh ? '受限工程助手' : 'Bounded Engineering Assistant'}
        </div>
        <div className="mt-1 text-[10px] leading-5 text-slate-500">
          {zh ? '只分析当前画板与报告；不浏览外部数据，不确认报警，不写 PLC。' : 'Analyzes the current canvas and report only; no external retrieval, alarm acknowledgement, or PLC writes.'}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 overflow-hidden rounded border border-slate-800">
        {([
          ['analyze', zh ? '分析' : 'Analyze'],
          ['teach', zh ? '教学' : 'Teach'],
          ['explain', zh ? '解释报告' : 'Explain'],
        ] as const).map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={`h-9 border-r border-slate-800 text-[10px] font-semibold last:border-r-0 ${mode === value ? 'bg-cyan-300/10 text-cyan-100' : 'text-slate-500 hover:text-slate-200'}`}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-3 block text-[10px] font-semibold text-slate-500" htmlFor="twin-ai-question">
        {zh ? '基于当前状态提问' : 'Ask about the current state'}
      </label>
      <textarea
        id="twin-ai-question"
        value={question}
        maxLength={600}
        onChange={(event) => setQuestion(event.target.value)}
        className="mt-1 min-h-24 w-full resize-y rounded border border-slate-700 bg-slate-900/72 p-2.5 text-xs leading-5 text-slate-100 outline-none transition focus:border-cyan-300/60"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[9px] text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5" />
          {twin.mode === 'gateway' ? (zh ? 'DeepSeek V4 Flash · 网关成本上限' : 'DeepSeek V4 Flash · gateway budget') : zh ? '本地规则 · 零 API 成本' : 'Local rules · zero API cost'}
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded border border-cyan-200/50 bg-cyan-200 px-3 text-[10px] font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void ask()}
          disabled={busy || !question.trim()}
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {zh ? '分析当前画板' : 'Analyze canvas'}
        </button>
      </div>

      {error ? <div className="mt-3 rounded border border-amber-300/30 bg-amber-300/8 p-2 text-[10px] leading-5 text-amber-100">{error}</div> : null}

      {result ? (
        <div className="mt-4 border-t border-slate-800 pt-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase text-cyan-100">{result.source}</span>
            <span className="text-[9px] text-slate-600">
              {result.usage.totalTokens > 0 ? `${result.usage.totalTokens} tokens${result.cached ? ' · cache' : ''}` : result.confidence}
            </span>
          </div>
          <p className="mt-2 text-xs leading-6 text-slate-200">{result.answer}</p>

          {result.evidence.length > 0 ? (
            <div className="mt-4">
              <div className="text-[9px] font-semibold uppercase text-slate-600">{zh ? '证据' : 'Evidence'}</div>
              <div className="mt-1 border-y border-slate-800">
                {result.evidence.slice(0, 5).map((item) => (
                  <div key={item} className="border-b border-slate-800 py-2 text-[10px] leading-5 text-slate-400 last:border-b-0">{item}</div>
                ))}
              </div>
            </div>
          ) : null}

          {result.actions.length > 0 ? (
            <div className="mt-4">
              <div className="text-[9px] font-semibold uppercase text-slate-600">{zh ? '建议操作（需手动确认）' : 'Suggested actions (manual approval)'}</div>
              <div className="mt-2 space-y-2">
                {result.actions.slice(0, 3).map((action, index) => {
                  const key = `${action.type}:${index}`;
                  const done = applied.includes(key);
                  return (
                    <div key={key} className="flex items-start justify-between gap-3 rounded border border-slate-800 bg-slate-900/45 p-2.5">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold text-slate-200">{action.label}</div>
                        <div className="mt-1 text-[9px] leading-4 text-slate-500">{action.reason}</div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-slate-700 px-2 text-[9px] font-semibold text-slate-300 hover:border-cyan-300/60 disabled:text-emerald-200"
                        onClick={() => applyAction(action, index)}
                        disabled={done}
                      >
                        <Check className="h-3 w-3" />
                        {done ? (zh ? '已应用' : 'Applied') : zh ? '应用' : 'Apply'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {result.assumptions.length > 0 ? (
            <div className="mt-4 text-[9px] leading-5 text-slate-600">
              {result.assumptions.slice(0, 3).map((item) => <div key={item}>• {item}</div>)}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
