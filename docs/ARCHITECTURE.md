# Architecture

Factory Takt Simulator is organized around a graph-based production-line model.

## Main Layers

```text
React UI
  -> Zustand store
    -> Simulation engine
    -> Takt calculator
    -> Bottleneck analyzer
    -> Report exporter
```

## Domain Model

The core domain types live in `src/types/factory.ts`.

- `FactoryNodeData`: process/module state and editable parameters.
- `FactoryEdgeData`: transfer-link parameters, route state, and animated in-flight material.
- `DeviceParams`: shared process configuration, buffer configuration, takt settings, and special process settings.
- `SimulatorSettings`: UI, animation, speed, and background simulation settings.

## Simulation Flow

The simulation engine is intentionally deterministic and local-first:

1. Resolve enabled nodes and connected edges.
2. Advance processing timers.
3. Apply maintenance pauses such as dressing or consumable change.
4. Move finished work into output buffers when capacity allows.
5. Move material through conveyor or loader-arm edges.
6. Accumulate waiting, blocking, utilization, and production counters.
7. Recompute takt and bottleneck indicators.

## UI Flow

The canvas is built with `@xyflow/react`:

- Custom node UI: `src/components/canvas/DeviceNode.tsx`
- Custom edge UI: `src/components/canvas/FlowEdge.tsx`
- Main canvas orchestration: `src/components/canvas/FactoryCanvas.tsx`
- Context menus: `src/components/canvas/CanvasContextMenu.tsx`

Right-side and bottom panels read from the Zustand store and patch node or edge parameters directly.

## Persistence

The app stores scenarios in local storage for convenience. Users can also export and import JSON files. Exported scenarios are plain JSON and should avoid private site data before being shared publicly.

## Extension Points

Good places to extend the app:

- Add a device type in `src/data/deviceCatalog.ts`.
- Add default parameters in `src/data/defaultState.ts`.
- Add route validation in `src/lib/portRules.ts`.
- Add takt formulas in `src/lib/takt.ts`.
- Add simulation behavior in `src/lib/simulation.ts` or a specialized helper.
- Add report logic in `src/lib/reporting.ts`.

Keep reusable logic generic. Put site-specific examples in `examples/` or `public/scenarios/`.
