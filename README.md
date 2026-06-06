# Factory Takt Simulator

Factory Takt Simulator is a modular production-line takt simulation workstation. It is designed for building a line visually, editing process and transfer parameters, running a discrete simulation, and reviewing capacity or bottleneck behavior from one screen.

中文定位：一个用于展示和验证产线节拍匹配的可视化沙盘。用户可以拖入工序、连接物流、配置缓存和节拍，再运行仿真查看待料、堵料、产出和瓶颈。

## Main Capabilities

- Visual line building with draggable process cards.
- Manual link creation through input and output ports.
- Conveyor and loader-arm transfer logic.
- Editable buffers, takt parameters, yield, uptime, dressing, and consumable change.
- Direct takt mode for quick estimation.
- Animated material movement on active transfer links.
- Scenario save, load, import, and export.
- Background simulation report by time or output target.
- Desktop packaging with Electron.
- Browser-side integration bridge for external assistants or automation scripts.

## Quick Start

```bash
npm install
npm run dev
```

Desktop mode:

```bash
npm run desktop
```

Windows portable package:

```bash
npm run dist:win
```

## Project Structure

```text
src/
  components/
    canvas/        Canvas, process cards, transfer links, context menu
    layout/        Main panels, settings, tutorial, project overview
    ui/            Reusable controls
  data/            Device catalog and default parameters
  hooks/           Keyboard shortcuts and local scenario memory
  i18n/            Interface text helpers
  lib/             Simulation, takt, analysis, reports, integration bridge
  store/           Application state
  types/           Shared domain types
electron/          Desktop shell
public/            Static assets and example scenario files
examples/          Exported scenario examples
docs/              Architecture, development, integration, and packaging notes
```

## Integration Bridge

After the app starts, external automation can access:

```ts
window.FactoryTaktAgent
```

Typical calls:

```ts
window.FactoryTaktAgent.getSnapshot()
window.FactoryTaktAgent.runCommand({ type: 'start' })
window.FactoryTaktAgent.runCommand({ type: 'runBackgroundSimulation' })
```

See `docs/AGENT_INTEGRATION.md` for the command list and packaging notes.

## Verification

```bash
npm run build
npm run lint
npm run maintain:check
```

Optional browser smoke test:

```bash
npm run start:local
npm run test:smoke
```

## Notes

- Example scenarios are synthetic and are meant for demonstration.
- Local scenario memory is stored in browser/Electron local storage.
- Packaged binaries, temporary reports, screenshots, and dependency folders are intentionally ignored by Git.
- The application can be rebranded and packaged as a separate desktop build by replacing assets in `public/brand` and Electron metadata in `package.json`.
