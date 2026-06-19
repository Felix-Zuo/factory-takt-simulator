import type { DeviceParameters } from '../types/factory';

const processTypes = new Set<DeviceParameters['deviceType']>([
  'process_a',
  'process_b',
  'process_c',
  'finishing',
  'finishing_b',
  'general_inspection',
  'inspection_a',
  'inspection_b',
  'join_station',
  'fasten_station',
  'functional_check',
  'performance_check',
  'fill_station',
  'press_station',
  'visual_inspection',
  'surface_treatment',
]);

export const supportsTaktSettings = (params: DeviceParameters) => processTypes.has(params.deviceType);
