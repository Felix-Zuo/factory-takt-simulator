import type { FactoryEdge, FactoryNode, FlowDirection } from '../types/factory';

const MIN_HORIZONTAL_DELTA = 24;

export const resolveFlowDirections = (
  nodes: FactoryNode[],
  edges: FactoryEdge[],
): Map<string, FlowDirection> => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const directionScores = new Map(nodes.map((node) => [node.id, 0]));

  edges.forEach((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) return;

    const deltaX = target.position.x - source.position.x;
    if (Math.abs(deltaX) < MIN_HORIZONTAL_DELTA) return;

    const score = deltaX > 0 ? 1 : -1;
    directionScores.set(source.id, (directionScores.get(source.id) ?? 0) + score);
    directionScores.set(target.id, (directionScores.get(target.id) ?? 0) + score);
  });

  return new Map(
    nodes.map((node) => [node.id, (directionScores.get(node.id) ?? 0) < 0 ? 'rtl' : 'ltr']),
  );
};
