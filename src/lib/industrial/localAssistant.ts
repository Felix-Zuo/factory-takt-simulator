import type { FactoryNode, SimulationSummary } from '../../types/factory';
import type { AiAssistantMode, AiAssistantResult, IndustrialSnapshot } from '../../types/industrial';

interface LocalAssistantInput {
  language: 'zh-CN' | 'en';
  mode: AiAssistantMode;
  question: string;
  summary: SimulationSummary;
  nodes: FactoryNode[];
  snapshot: IndustrialSnapshot;
  isRunning: boolean;
}

export const buildLocalAssistantResult = ({
  language,
  mode,
  question,
  summary,
  nodes,
  snapshot,
  isRunning,
}: LocalAssistantInput): AiAssistantResult => {
  const zh = language === 'zh-CN';
  const bottleneckNode = nodes.find((node) => node.id === summary.bottleneck.nodeId);
  const activeAlarms = snapshot.alarms.filter((alarm) => alarm.state === 'active');
  const evidence = [
    zh
      ? `当前理论瓶颈为 ${summary.bottleneck.label}，能力 ${summary.theoreticalCapacityPerHour.toFixed(1)} pcs/h。`
      : `Current theoretical bottleneck is ${summary.bottleneck.label} at ${summary.theoreticalCapacityPerHour.toFixed(1)} pcs/h.`,
    zh
      ? `仿真产能 ${summary.simulationCapacityPerHour.toFixed(1)} pcs/h，线平衡率 ${(summary.bottleneck.lineBalanceRate * 100).toFixed(1)}%。`
      : `Simulated capacity is ${summary.simulationCapacityPerHour.toFixed(1)} pcs/h with ${(summary.bottleneck.lineBalanceRate * 100).toFixed(1)}% line balance.`,
    zh ? `实时孪生中有 ${snapshot.assets.length} 个资产、${activeAlarms.length} 个活动报警。` : `${snapshot.assets.length} twin assets and ${activeAlarms.length} active alarms are visible.`,
  ];
  const answer =
    mode === 'teach'
      ? zh
        ? `先区分“理论能力最低”和“运行时真正拖慢”。${summary.bottleneck.reason} 建议只改一个参数并复跑相同目标，再比较等待、阻塞和产出变化。`
        : `Separate the lowest theoretical capacity from the runtime constraint. ${summary.bottleneck.reason} Change one parameter, rerun the same target, then compare waiting, blocking, and output.`
      : mode === 'explain'
        ? zh
          ? `这份判断同时使用工序节拍、运行等待/阻塞信号和转运能力。${summary.bottleneck.reason}`
          : `This finding combines process takt, runtime waiting/blocking signals, and transfer capacity. ${summary.bottleneck.reason}`
        : zh
          ? `针对“${question}”：优先验证 ${summary.bottleneck.label} 及其相邻转运是否持续受限。${summary.bottleneck.recommendations[0] ?? '保持当前方案并延长仿真观察窗口。'}`
          : `For “${question}”, first verify whether ${summary.bottleneck.label} and its adjacent transfer remain constrained. ${summary.bottleneck.recommendations[0] ?? 'Keep the current setup and extend the observation window.'}`;

  return {
    answer,
    evidence,
    assumptions: [
      zh ? '当前为合成演示或本地规则分析，不代表已完成现场调试。' : 'This is synthetic demo or local-rule analysis, not commissioned plant advice.',
      zh ? '未将报警确认、设备联锁或 PLC 写入交给 AI。' : 'AI has no access to alarm acknowledgement, safety interlocks, or PLC writes.',
    ],
    actions: [
      ...(bottleneckNode
        ? [{
            type: 'focus_node' as const,
            targetId: bottleneckNode.id,
            label: zh ? `定位 ${bottleneckNode.data.params.deviceShortName}` : `Focus ${bottleneckNode.data.params.deviceShortName}`,
            reason: zh ? '在画板上检查瓶颈工序参数与上下游连接。' : 'Inspect the bottleneck parameters and adjacent routes on the canvas.',
          }]
        : []),
      {
        type: isRunning ? ('pause_simulation' as const) : ('run_background_analysis' as const),
        label: isRunning ? (zh ? '暂停后复查' : 'Pause for review') : zh ? '运行后台分析' : 'Run background analysis',
        reason: isRunning
          ? zh ? '冻结当前状态以复核运行证据。' : 'Freeze the current state for evidence review.'
          : zh ? '以固定目标生成可复查报告。' : 'Generate a reviewable report against a fixed target.',
      },
    ],
    confidence: summary.elapsedSec >= 300 ? 'medium' : 'low',
    source: 'local-rules',
    cached: false,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, remainingDailyTokens: null },
  };
};
