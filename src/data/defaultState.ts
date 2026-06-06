import type { AppSettings, PanelState } from '../types/factory';

export const SETTINGS_KEY = 'factory-takt-simulator:settings:v2';

export const defaultSettings: AppSettings = {
  language: 'zh-CN',
  themeMode: 'dark',
  animationIntensity: 'standard',
  cardDensity: 'compact',
  snapToGrid: true,
  hideText: false,
  simulationTargetMode: 'time',
  simulationTargetHours: 8,
  simulationTargetOutput: 10000,
  backgroundStepSec: 1,
};

export const defaultPanels: PanelState = {
  leftCollapsed: false,
  rightCollapsed: false,
  bottomCollapsed: false,
  taktCollapsed: false,
  logCollapsed: true,
  leftWidth: 264,
  rightWidth: 340,
  bottomHeight: 260,
};
