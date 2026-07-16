import { create } from 'zustand';
import type {
  IndustrialSnapshot,
  TwinConnectionState,
  TwinSourceMode,
} from '../types/industrial';

const STORAGE_KEY = 'factory-takt-simulator:industrial:v1';
const DEFAULT_GATEWAY_URL = 'http://127.0.0.1:8787';

interface StoredTwinSettings {
  mode: TwinSourceMode;
  gatewayUrl: string;
}

interface TwinState extends StoredTwinSettings {
  dockOpen: boolean;
  activeTab: 'assets' | 'alarms' | 'assistant' | 'connection';
  connectionState: TwinConnectionState;
  connectionMessage: string;
  snapshot: IndustrialSnapshot;
  selectedAssetId: string | null;
  setMode: (mode: TwinSourceMode) => void;
  setGatewayUrl: (gatewayUrl: string) => void;
  setDockOpen: (open: boolean) => void;
  toggleDock: () => void;
  setActiveTab: (tab: TwinState['activeTab']) => void;
  setConnection: (state: TwinConnectionState, message?: string) => void;
  setSnapshot: (snapshot: IndustrialSnapshot) => void;
  selectAsset: (assetId: string | null) => void;
}

const emptySnapshot = (source: TwinSourceMode): IndustrialSnapshot => ({
  schemaVersion: '1.0',
  source,
  generatedAt: new Date(0).toISOString(),
  sequence: 0,
  assets: [],
  alarms: [],
});

const validGatewayUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && !parsed.username
      && !parsed.password
      && !parsed.search
      && !parsed.hash;
  } catch {
    return false;
  }
};

const readStoredSettings = (): StoredTwinSettings => {
  if (typeof localStorage === 'undefined') return { mode: 'demo', gatewayUrl: DEFAULT_GATEWAY_URL };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<StoredTwinSettings>;
    return {
      mode: parsed.mode === 'gateway' ? 'gateway' : 'demo',
      gatewayUrl: typeof parsed.gatewayUrl === 'string' && validGatewayUrl(parsed.gatewayUrl)
        ? parsed.gatewayUrl.replace(/\/$/, '')
        : DEFAULT_GATEWAY_URL,
    };
  } catch {
    return { mode: 'demo', gatewayUrl: DEFAULT_GATEWAY_URL };
  }
};

const persist = (settings: StoredTwinSettings) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable in hardened or private browser contexts.
  }
};

const stored = readStoredSettings();

export const useTwinStore = create<TwinState>((set, get) => ({
  ...stored,
  dockOpen: false,
  activeTab: 'assets',
  connectionState: stored.mode === 'demo' ? 'demo' : 'offline',
  connectionMessage: stored.mode === 'demo' ? 'Synthetic live feed' : 'Gateway not connected',
  snapshot: emptySnapshot(stored.mode),
  selectedAssetId: null,
  setMode: (mode) => {
    if (get().mode === mode) return;
    const gatewayUrl = get().gatewayUrl;
    persist({ mode, gatewayUrl });
    set({
      mode,
      connectionState: mode === 'demo' ? 'demo' : 'connecting',
      connectionMessage: mode === 'demo' ? 'Synthetic live feed' : 'Connecting to industrial gateway',
      snapshot: emptySnapshot(mode),
      selectedAssetId: null,
    });
  },
  setGatewayUrl: (gatewayUrl) => {
    const normalized = gatewayUrl.trim().replace(/\/$/, '');
    if (!validGatewayUrl(normalized) || normalized === get().gatewayUrl) return;
    const mode = get().mode;
    persist({ mode, gatewayUrl: normalized });
    set({
      gatewayUrl: normalized,
      ...(mode === 'gateway'
        ? {
            connectionState: 'connecting' as const,
            connectionMessage: 'Connecting to industrial gateway',
            snapshot: emptySnapshot('gateway'),
            selectedAssetId: null,
          }
        : {}),
    });
  },
  setDockOpen: (dockOpen) => set({ dockOpen }),
  toggleDock: () => set((state) => ({ dockOpen: !state.dockOpen })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setConnection: (connectionState, connectionMessage = '') => set({ connectionState, connectionMessage }),
  setSnapshot: (snapshot) =>
    set((state) => ({
      snapshot,
      selectedAssetId:
        state.selectedAssetId && snapshot.assets.some((asset) => asset.assetId === state.selectedAssetId)
          ? state.selectedAssetId
          : snapshot.assets[0]?.assetId ?? null,
    })),
  selectAsset: (selectedAssetId) => set({ selectedAssetId }),
}));
