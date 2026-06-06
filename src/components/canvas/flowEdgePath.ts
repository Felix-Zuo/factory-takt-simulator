export const buildManualPath = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offsetX: number,
  offsetY: number,
  edgeShape?: string,
) => {
  const controlX = (sourceX + targetX) / 2 + offsetX;
  const controlY = (sourceY + targetY) / 2 + offsetY;
  const path =
    edgeShape === 'orthogonal'
      ? `M ${sourceX} ${sourceY} L ${controlX} ${sourceY} L ${controlX} ${controlY} L ${targetX} ${controlY} L ${targetX} ${targetY}`
      : `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
  return { path, controlX, controlY };
};
