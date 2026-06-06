import type {
  DeviceParameters,
  FactoryNode,
  MaterialKind,
  PortMaterialFilter,
  PortRule,
  PortSide,
} from '../types/factory';

export const MAX_PORT_COUNT = 4;

export const clampPortCount = (value: unknown, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(MAX_PORT_COUNT, Math.round(parsed)));
};

const materialFromFilter = (filter: PortMaterialFilter, fallback: MaterialKind): MaterialKind =>
  filter === 'any' ? fallback : filter;

const portIndex = (handleId: string) => {
  const parsed = Number(handleId.split('-')[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const defaultPortRule = (
  side: PortSide,
  handleId: string,
  materialFilter: PortMaterialFilter = 'any',
): PortRule => {
  const index = portIndex(handleId);
  return {
    enabled: true,
    label: `${side === 'input' ? 'IN' : 'OUT'}${index}`,
    materialFilter,
    routingStrategy: side === 'input' ? 'lowest_inventory_first' : 'round_robin',
    blockedBehavior: side === 'input' ? 'wait_blocked' : 'skip_blocked',
    minBatch: 1,
    maxBatch: 9999,
    priority: index,
    allocationRatio: 1,
  };
};

export const getPortRule = (params: DeviceParameters, side: PortSide, handleId: string): PortRule => {
  const rules = side === 'input' ? params.inputPortRules : params.outputPortRules;
  const fallbackMaterial =
    side === 'output'
      ? materialForOutputPort(params, handleId, false)
      : (params.materialKind === 'mixed' ? 'any' : params.materialKind);
  return {
    ...defaultPortRule(side, handleId, fallbackMaterial),
    ...(rules?.[handleId] ?? {}),
  };
};

export const buildPortRulePatch = (
  params: DeviceParameters,
  side: PortSide,
  handleId: string,
  patch: Partial<PortRule>,
): Partial<DeviceParameters> => {
  const mapKey = side === 'input' ? 'inputPortRules' : 'outputPortRules';
  return {
    [mapKey]: {
      ...(params[mapKey] as Record<string, PortRule>),
      [handleId]: {
        ...getPortRule(params, side, handleId),
        ...patch,
      },
    },
  } as Partial<DeviceParameters>;
};

export const materialForOutputPort = (
  params: DeviceParameters,
  handleId = 'out-1',
  allowAny = true,
): PortMaterialFilter => {
  const explicit = params.outputPortRules?.[handleId]?.materialFilter;
  if (explicit && explicit !== 'any') return explicit;
  if (allowAny && explicit === 'any') return 'any';
  if (handleId === 'out-2') return params.output2MaterialKind ?? params.materialKind ?? 'mixed';
  return params.output1MaterialKind ?? params.materialKind ?? 'mixed';
};

export const acceptedMaterialsForInput = (
  params: DeviceParameters,
  handleId = 'in-1',
): MaterialKind[] => {
  if (params.deviceType === 'assembly_storage' || params.deviceType === 'pairing_station') {
    return handleId === 'in-2' ? ['small_ring'] : ['big_ring'];
  }
  const byMachine: MaterialKind[] =
    params.deviceType === 'or_grinder' || params.deviceType === 'superfinishing'
      ? ['big_ring']
      : params.deviceType === 'ir_grinder' ||
          params.deviceType === 'bore_grinder' ||
          params.deviceType === 'small_superfinishing'
        ? ['small_ring']
        : ['big_ring', 'small_ring', 'mixed'];
  const filter = params.inputPortRules?.[handleId]?.materialFilter ?? 'any';
  if (filter === 'any' || filter === 'mixed') return [...byMachine];
  const material = materialFromFilter(filter, 'mixed');
  return byMachine.includes(material) ? [material] : [];
};

export const canConnectByMaterial = (
  nodes: FactoryNode[],
  sourceId: string,
  targetId: string,
  sourceHandle = 'out-1',
  targetHandle = 'in-1',
) => {
  const source = nodes.find((node) => node.id === sourceId);
  const target = nodes.find((node) => node.id === targetId);
  if (!source || !target) return { ok: false, reason: 'Missing source or target node.' };

  const outputFilter = materialForOutputPort(source.data.params, sourceHandle);
  const material = materialFromFilter(outputFilter, source.data.params.materialKind ?? 'mixed');
  const accepted = acceptedMaterialsForInput(target.data.params, targetHandle);
  if (material !== 'mixed' && !accepted.includes(material)) {
    const materialName = material === 'big_ring' ? 'big ring' : 'small ring';
    return {
      ok: false,
      reason: `${source.data.params.deviceShortName} ${sourceHandle} outputs ${materialName}, incompatible with ${target.data.params.deviceShortName} ${targetHandle}.`,
    };
  }
  return { ok: true, reason: '' };
};
