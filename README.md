# Factory Takt Simulator

Factory Takt Simulator is an open-source prototype for modular production-line takt simulation. It provides a visual sandbox for building discrete manufacturing lines, connecting process modules, editing buffers and transfer logic, running simulations, and generating bottleneck analysis.

> 中文说明：这是一个通用产线节拍仿真沙盘项目。公开版不绑定任何具体公司或现场数据，仓库内置的产线只是合成示例，用于演示建模、仿真、节拍计算和瓶颈分析能力。

## What It Does

- Drag production modules onto a React Flow canvas.
- Connect modules with conveyor or loader-arm transfer links.
- Configure takt, batch size, buffers, material type, yield, uptime, dressing, and consumable changes.
- Run animated simulations with material flow particles.
- Analyze effective capacity, waiting time, blocking time, utilization, and bottleneck risk.
- Save, import, export, and replay scenarios locally.
- Generate background simulation reports without rendering every animation frame.
- Package as a desktop app with Electron.

## Tech Stack

- React
- TypeScript
- Vite
- Electron
- @xyflow/react
- Zustand
- Framer Motion
- Tailwind CSS

## Quick Start

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

For a desktop run:

```bash
npm run desktop
```

For a Windows portable build:

```bash
npm run dist:win
```

## Repository Layout

```text
src/
  components/
    canvas/        React Flow canvas, custom nodes, custom edges, context menus
    layout/        Top bar, panels, scenario library, settings, tutorial UI
    ui/            Reusable controls
  data/            Device catalog, default state, edge defaults
  hooks/           Persistence and scenario memory hooks
  i18n/            Centralized UI text helpers
  lib/             Simulation, takt calculation, bottleneck analysis, reporting
  store/           Zustand application store
  types/           Shared domain types
electron/          Desktop shell entry
public/            Static brand/scenario assets
examples/          Example scenario exports
docs/              Architecture and publication notes
scripts/           Build, smoke, maintenance, and packaging helpers
```

## Scenario Model

The simulator treats a line as a graph:

- **Node**: one production process, buffer, source, sink, inspection station, dryer, cleaner, or assembly station.
- **Port**: one input/output point on a node. Ports can carry material filters and routing rules.
- **Edge**: one transfer path. Conveyor edges model travel time and in-flight capacity. Loader-arm edges model pick, move, place, and return time.
- **Simulation tick**: a deterministic time step that updates node processing, maintenance pauses, buffer movement, transfer movement, and analysis counters.

## Public Example Data

The bundled scenario is synthetic. It is intentionally based on common discrete-manufacturing concepts such as machining, inspection, cleaning, drying, transfer buffers, pairing, and packing. It is not a production recipe and should not be treated as operational advice.

## Open-Source Preparation Notes

Before publishing to GitHub:

1. Replace `YOUR_ORG` in `package.json` with the real GitHub organization or user name.
2. Review `docs/PUBLICATION_CHECKLIST.md`.
3. Confirm no private scenario, customer name, operator name, path, report, screenshot, `.env`, or packaged binary is committed.
4. Run:

```bash
npm run build
npm run lint
npm run maintain:check
```

## License

This project is prepared under the Apache License 2.0. See [LICENSE](LICENSE).

Some dependencies use their own licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
