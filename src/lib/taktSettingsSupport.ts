import type { DeviceParameters } from '../types/factory';

const processTypes = new Set<DeviceParameters['deviceType']>([
  'or_grinder',
  'ir_grinder',
  'bore_grinder',
  'superfinishing',
  'small_superfinishing',
  'general_gauge',
  'eddy_check',
  'dimension_check',
  'pairing_station',
  'riveting_station',
  'flexibility_check',
  'vibration_check',
  'grease_injection',
  'cap_press',
  'visual_check',
  'rust_proof',
]);

export const supportsTaktSettings = (params: DeviceParameters) => processTypes.has(params.deviceType);
