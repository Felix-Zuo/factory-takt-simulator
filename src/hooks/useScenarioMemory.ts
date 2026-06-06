import { useEffect } from 'react';
import { persistLatestScenarioState, readReportMemory, writeReportMemory } from '../lib/scenarioPersistence';
import { useFactoryStore } from '../store/factoryStore';
import type { ScenarioPayload } from '../lib/scenarioPersistence';

const DEFAULT_SCENARIO_URL = '/scenarios/deep-groove-post-grind-template.json';

export function useScenarioMemory() {
  const bootstrapScenario = useFactoryStore((state) => state.bootstrapScenario);

  useEffect(() => {
    const memory = readReportMemory();
    useFactoryStore.setState({ records: memory.records, latestReport: memory.latestReport });
    fetch(DEFAULT_SCENARIO_URL)
      .then((response) => response.json() as Promise<ScenarioPayload>)
      .then((payload) => bootstrapScenario(payload))
      .catch(() => bootstrapScenario({ nodes: [], edges: [] }));
  }, [bootstrapScenario]);

  useEffect(() => {
    let saveTimer = 0;
    const unsubscribe = useFactoryStore.subscribe(() => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const latest = useFactoryStore.getState();
        writeReportMemory(latest.records, latest.latestReport);
        if (latest.nodes.length === 0) return;
        persistLatestScenarioState(latest);
      }, 700);
    });
    return () => {
      window.clearTimeout(saveTimer);
      unsubscribe();
    };
  }, []);
}
