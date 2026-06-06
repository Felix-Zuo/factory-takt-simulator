# Agent Integration

The app exposes a small browser-side bridge after it starts:

```ts
window.FactoryTaktAgent
```

This works in the browser and in the Electron desktop package. It does not require a backend service.

## Snapshot

```ts
const snapshot = window.FactoryTaktAgent.getSnapshot()
```

The snapshot includes:

- `version`
- `elapsedSec`
- `isRunning`
- `speed`
- `nodes`
- `edges`
- `settings`
- `summary`
- `latestReport`

## Commands

```ts
window.FactoryTaktAgent.runCommand({ type: 'start' })
window.FactoryTaktAgent.runCommand({ type: 'pause' })
window.FactoryTaktAgent.runCommand({ type: 'reset' })
window.FactoryTaktAgent.runCommand({ type: 'setSpeed', speed: 20 })
window.FactoryTaktAgent.runCommand({ type: 'runBackgroundSimulation' })
```

Scenario commands:

```ts
window.FactoryTaktAgent.runCommand({ type: 'saveScenario', name: 'Line A' })
window.FactoryTaktAgent.runCommand({ type: 'loadScenario', scenarioId: '...' })
window.FactoryTaktAgent.runCommand({ type: 'importScenario', json, name: 'Imported line' })
```

Editing commands:

```ts
window.FactoryTaktAgent.runCommand({ type: 'addDevice', deviceType: 'general_gauge', x: 400, y: 240 })
window.FactoryTaktAgent.runCommand({ type: 'updateNode', nodeId: 'node-id', patch: { processTimeSec: 8 } })
window.FactoryTaktAgent.runCommand({ type: 'updateEdge', edgeId: 'edge-id', patch: { travelTimeSec: 4 } })
```

## Event

The app emits this event after the bridge is ready:

```ts
window.addEventListener('factory-takt-agent-ready', event => {
  console.log(event.detail.version)
})
```

## Packaging A Branded Build

For a separate branded build:

1. Replace files in `public/brand`.
2. Update `productName`, `appId`, and icon paths in `package.json`.
3. Adjust default scenarios in `examples` or `public/scenarios`.
4. Run `npm run dist:win`.

The bridge stays the same, so an external assistant can keep using the same command surface.
