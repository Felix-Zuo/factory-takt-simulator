# Architecture

Factory Takt Simulator is built as a local-first graph editor plus deterministic simulation engine.

## Runtime Layers

```text
React interface
  -> Zustand store
    -> Simulation engine
    -> Takt calculator
    -> Bottleneck analyzer
    -> Report exporter
    -> Agent bridge
```

## Important Folders

- `src/components/canvas`: React Flow canvas, process cards, custom links, route handles.
- `src/components/layout`: toolbar, panels, settings, tutorial, project overview.
- `src/data`: device catalog, default state, default link data.
- `src/lib`: domain logic, simulation, takt, reporting, route rules, agent bridge.
- `src/store`: single application store.
- `src/types`: shared TypeScript model.

## Scenario Model

A scenario is a graph:

- **Node**: process, source, sink, buffer, inspection, cleaner, dryer, or assembly station.
- **Port**: a specific input or output point on a node.
- **Edge**: transfer route between ports.
- **Runtime state**: buffers, timers, in-flight material, counters, and warnings.

The graph is stored locally and can be exported as JSON.

## Simulation Tick

Each tick follows the same order:

1. Clone current nodes and edges.
2. Advance process timers and maintenance timers.
3. Move finished work into output buffers when capacity allows.
4. Dispatch conveyor packets or loader-arm actions when both source and target are ready.
5. Advance in-flight packets.
6. Accumulate waiting, blocking, utilization, and output metrics.
7. Recompute summary and bottleneck analysis.

Keeping this deterministic makes it easier to test, reproduce, and connect external automation.
