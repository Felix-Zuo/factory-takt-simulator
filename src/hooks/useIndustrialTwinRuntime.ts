import { useEffect, useRef } from 'react';
import { buildDemoTwinSnapshot } from '../lib/industrial/demoTwin';
import { fetchIndustrialSnapshot, normalizeGatewayUrl, parseIndustrialSnapshot } from '../lib/industrial/gatewayClient';
import { useFactoryStore } from '../store/factoryStore';
import { useTwinStore } from '../store/twinStore';

export function useIndustrialTwinRuntime() {
  const mode = useTwinStore((state) => state.mode);
  const gatewayUrl = useTwinStore((state) => state.gatewayUrl);
  const setSnapshot = useTwinStore((state) => state.setSnapshot);
  const setConnection = useTwinStore((state) => state.setConnection);
  const sequence = useRef(0);

  useEffect(() => {
    if (mode !== 'demo') return undefined;
    const publish = () => {
      const factory = useFactoryStore.getState();
      sequence.current += 1;
      setSnapshot(buildDemoTwinSnapshot(factory.nodes, factory.elapsedSec, sequence.current));
      setConnection('demo', 'Synthetic live feed');
    };
    publish();
    const timer = window.setInterval(publish, 500);
    return () => window.clearInterval(timer);
  }, [mode, setConnection, setSnapshot]);

  useEffect(() => {
    if (mode !== 'gateway') return undefined;
    const abortController = new AbortController();
    let eventSource: EventSource | null = null;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    let lastSnapshotAt = 0;
    let connecting = false;
    let disposed = false;

    const scheduleReconnect = () => {
      if (disposed || retryTimer !== undefined) return;
      const backoff = Math.min(30_000, 1000 * (2 ** retryAttempt));
      const delay = backoff + Math.round(Math.random() * 500);
      retryAttempt = Math.min(retryAttempt + 1, 5);
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (disposed || connecting) return;
      connecting = true;
      eventSource?.close();
      eventSource = null;
      setConnection('connecting', 'Connecting to industrial gateway');
      try {
        const normalized = normalizeGatewayUrl(gatewayUrl);
        const initial = await fetchIndustrialSnapshot(normalized, abortController.signal);
        if (disposed) return;
        lastSnapshotAt = Date.now();
        retryAttempt = 0;
        setSnapshot(initial);
        setConnection('connected', 'Industrial gateway online');
        eventSource = new EventSource(`${normalized}/api/industrial/stream`);
        eventSource.onmessage = (event) => {
          try {
            setSnapshot(parseIndustrialSnapshot(JSON.parse(event.data)));
            lastSnapshotAt = Date.now();
            retryAttempt = 0;
            setConnection('connected', 'Industrial gateway online');
          } catch (error) {
            setConnection('degraded', error instanceof Error ? error.message : 'Invalid gateway payload');
          }
        };
        eventSource.onerror = () => {
          if (disposed) return;
          setConnection('degraded', 'Live stream interrupted; retrying');
          eventSource?.close();
          eventSource = null;
          scheduleReconnect();
        };
      } catch (error) {
        if (abortController.signal.aborted || disposed) return;
        setConnection('offline', error instanceof Error ? error.message : 'Gateway unavailable');
        scheduleReconnect();
      } finally {
        connecting = false;
      }
    };

    void connect();
    const staleTimer = window.setInterval(() => {
      if (!disposed && eventSource && lastSnapshotAt > 0 && Date.now() - lastSnapshotAt > 10_000) {
        setConnection('degraded', 'Gateway stream is stale; awaiting a fresh snapshot');
      }
    }, 2000);
    return () => {
      disposed = true;
      abortController.abort();
      eventSource?.close();
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.clearInterval(staleTimer);
    };
  }, [gatewayUrl, mode, setConnection, setSnapshot]);
}
