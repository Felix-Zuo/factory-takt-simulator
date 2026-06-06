import type { FactoryEdge, FactoryNode, SimulationSummary } from '../types/factory';
import { calculateEdgeCapacityPerHour, formatNumber } from './takt';

export interface SimulationRecord {
  id: string;
  createdAt: string;
  title: string;
  elapsedSec: number;
  finishedOutput: number;
  bottleneck: string;
  report: string;
}

const statusText = (status: string) =>
  ({
    idle: '空闲',
    running: '运行',
    waiting_material: '待料',
    blocked: '堵料',
    dressing: '修整',
    changing_consumable: '换耗材',
    stopped: '停用',
    fault: '故障',
    arm_wait_pick: '等待取料',
    arm_wait_space: '等待下游空间',
    transporting: '运输中',
  })[status] ?? status;

const severityText = (severity: string) =>
  ({
    critical: '关键',
    warning: '提醒',
    info: '观察',
  })[severity] ?? severity;

export const finishedOutput = (nodes: FactoryNode[], edges: FactoryEdge[]) => {
  const sourceIds = new Set(edges.map((edge) => edge.source));
  return nodes
    .filter((node) => node.data.params.deviceType === 'finished_sink' || !sourceIds.has(node.id))
    .reduce((sum, node) => sum + node.data.metrics.totalOutput, 0);
};

export const buildSimulationReport = (
  nodes: FactoryNode[],
  edges: FactoryEdge[],
  summary: SimulationSummary,
  title = 'Factory Takt Simulation Report',
) => {
  const output = finishedOutput(nodes, edges);
  const activeNodes = nodes.filter((node) => node.data.params.enabled);
  const edgeRows = edges
    .filter((edge) => edge.data)
    .map((edge) => {
      const source = nodes.find((node) => node.id === edge.source)?.data.params.deviceShortName ?? edge.source;
      const target = nodes.find((node) => node.id === edge.target)?.data.params.deviceShortName ?? edge.target;
      return `| ${source} -> ${target} | ${edge.data!.transportType} | ${formatNumber(calculateEdgeCapacityPerHour(edge.data!), 1)} | ${edge.data!.warning ?? '-'} |`;
    })
    .join('\n');

  const nodeRows = activeNodes
    .map((node) => {
      const p = node.data.params;
      const m = node.data.metrics;
      return `| ${p.deviceCode} | ${p.deviceShortName} | ${statusText(node.data.runtime.status)} | ${formatNumber(m.averageSinglePieceTakt, 2)} | ${formatNumber(m.theoreticalCapacityPerHour, 1)} | ${m.totalOutput} | ${formatNumber(m.utilization * 100, 1)}% | ${formatNumber(m.totalWaitingTime, 0)} | ${formatNumber(m.totalBlockedTime, 0)} |`;
    })
    .join('\n');

  const stageRows = summary.stageAnalysis
    .map(
      (stage) =>
        `| ${stage.label} | ${stage.nodeIds.length} | ${formatNumber(stage.avgTaktSec, 2)} | ${formatNumber(stage.capacityPerHour, 1)} | ${stage.totalOutput} | ${formatNumber(stage.utilization * 100, 1)}% |`,
    )
    .join('\n');

  const actionableIssues = summary.bottleneck.issues.filter((item) => item.severity !== 'info');
  const observationIssues = summary.bottleneck.issues.filter((item) => item.severity === 'info');
  const issueRows = actionableIssues
    .slice(0, 12)
    .map(
      (item, index) =>
        `${index + 1}. **[${severityText(item.severity)}] ${item.position}** ${item.reason}\n   风险：${item.risk}\n   建议：${item.suggestions.join('；')}`,
    )
    .join('\n\n');
  const observationRows = observationIssues
    .slice(0, 8)
    .map((item, index) => `${index + 1}. **${item.position}** ${item.reason}`)
    .join('\n');

  return `# ${title}

生成时间：${new Date().toLocaleString()}

## 总览

- 仿真时长：${formatNumber(summary.elapsedSec / 3600, 2)} 小时
- 成品产出：${output} pcs
- 主约束判断：${summary.bottleneck.label}
- 主约束能力：${formatNumber(summary.theoreticalCapacityPerHour, 1)} pcs/h
- 仿真产能：${formatNumber(summary.simulationCapacityPerHour, 1)} pcs/h
- 主加工平衡率：${formatNumber(summary.bottleneck.lineBalanceRate * 100, 1)}%

## 瓶颈判断口径

- 优先判断大沟、大超、小沟、内径、小超等主加工工序的有效能力。
- 检测、储料、甩干、成品点属于冗余/缓冲工序；它们待料通常是正常匹配现象，不单独判为瓶颈。
- 检测或甩干只有在能力低于相邻主加工需求，并且造成主加工待料或上游主加工堵料时，才进入主要问题。
- 连线缓存满、机械手等待下游空间优先作为症状追溯到下游主加工或真实运输能力，不再直接把辅助线体判成理论瓶颈。

## 瓶颈原因

${summary.bottleneck.reason}

## 推荐动作

${summary.bottleneck.recommendations.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## 工序阶段

| 阶段 | 节点数 | 平均节拍(s) | 小时能力(pcs/h) | 累计产出 | 平均利用率 |
| --- | ---: | ---: | ---: | ---: | ---: |
${stageRows || '| - | 0 | 0 | 0 | 0 | 0% |'}

## 设备明细

| 编号 | 工序 | 状态 | 综合节拍(s) | 理论能力(pcs/h) | 产出 | 利用率 | 待料(s) | 堵料(s) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
${nodeRows || '| - | - | - | 0 | 0 | 0 | 0% | 0 | 0 |'}

## 连线/机械手

| 路线 | 类型 | 能力(pcs/h) | 当前提示 |
| --- | --- | ---: | --- |
${edgeRows || '| - | - | 0 | - |'}

## 主要问题

${issueRows || '暂无会拖慢主加工链路的关键问题。检测待料、成品点待料或末端冗余等待已按正常缓冲现象处理。'}

## 观察项

${observationRows || '暂无需要单独观察的辅助症状。'}
`;
};

export const recordsToCsv = (records: SimulationRecord[]) => [
  'createdAt,title,elapsedHours,finishedOutput,bottleneck',
  ...records.map((record) =>
    [
      record.createdAt,
      record.title,
      (record.elapsedSec / 3600).toFixed(3),
      String(record.finishedOutput),
      record.bottleneck,
    ]
      .map((value) => `"${value.replace(/"/g, '""')}"`)
      .join(','),
  ),
].join('\n');

export const downloadText = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
  const needsBom = /charset=utf-8/i.test(mime) && !content.startsWith('\uFEFF');
  const blob = new Blob([needsBom ? `\uFEFF${content}` : content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
