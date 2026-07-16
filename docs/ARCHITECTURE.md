# Architecture

Factory Takt Simulator is a local-first graph simulator with an optional industrial digital-twin boundary. Simulation and plant telemetry share a canvas, but they remain separate state domains so a live signal cannot silently rewrite a scenario.

## System Layers

```text
Plant edge
  PLCs / machine controllers / sensors / valve islands
    -> OPC UA drivers or MQTT Sparkplug B
      -> Ignition tags and alarms
        -> Sepasoft operation context (optional)

Site gateway
  Ignition Web Dev, Sparkplug adapter, or normalized producer
    -> authenticated bounded snapshot
      -> Factory Takt Industrial Gateway
        -> validation, origin policy, in-memory state, SSE
        -> optional bounded DeepSeek request

Browser or desktop workbench
  React Flow canvas
    -> simulation store and deterministic engine
    -> industrial twin store and read-only live snapshot
    -> reporting, bottleneck analysis, and agent bridge
```

## Trust Boundaries

1. PLC and safety logic remain authoritative at the plant edge.
2. The browser never receives PLC credentials, ingest tokens, operator tokens, or AI keys.
3. Industrial snapshots are untrusted until the gateway validates schema version, source, collection sizes, IDs, references, enums, numbers, and text bounds.
4. Live state is displayed beside simulation state; it does not mutate process parameters automatically.
5. AI receives only bounded report and twin context. Its output is sanitized JSON and cannot call industrial command routes.
6. Command preview and command execution are separate. Execution is disabled by default and requires site-specific authorization, confirmation, interlocks, and audit.

## Frontend Domains

- `src/store/factoryStore.ts`: scenario graph, runtime simulation, reports, records, and UI settings.
- `src/store/twinStore.ts`: demo or gateway mode, connection state, normalized snapshot, selected asset, and console state.
- `src/hooks/useIndustrialTwinRuntime.ts`: deterministic demo projection or gateway snapshot/SSE lifecycle.
- `src/components/canvas`: graph canvas, process cards, transfer links, route handles, and compact twin badges.
- `src/components/industrial`: assets, alarms, bounded assistant, and connection/preview surfaces.
- `src/lib/industrial`: gateway parsing, deterministic demo mapping, and local rule analysis.
- `src/lib/agentBridge.ts`: read-only snapshot export plus allowlisted simulator commands.

## Gateway Domains

- `server/gateway.mjs`: HTTP routes, CORS policy, ingestion, normalization, SSE, optional Ignition polling, and command boundary.
- `server/ai-policy.mjs`: fixed prompt, context bounds, action allowlist, JSON parsing, and response sanitization.
- `integration/presets`: reference mappings for Ignition/Sepasoft and MQTT Sparkplug B.
- `integration/examples`: synthetic normalized event payloads used for commissioning and tests.

The gateway uses Node built-ins and keeps no durable plant history by default. A production deployment should place it behind the site's approved reverse proxy, identity, certificate, logging, secret-management, and monitoring controls.

## Scenario Model

A scenario is a deterministic graph:

- **Node**: process, source, sink, buffer, inspection, cleaner, dryer, or assembly station.
- **Port**: a material-specific input or output point.
- **Edge**: conveyor or loader-arm transfer route between ports.
- **Runtime state**: buffers, timers, in-flight material, counters, and warnings.

The graph is stored locally and can be exported as bounded JSON. Imported data is validated before hydration.

## Simulation Tick

Each tick follows the same order:

1. Clone current nodes and edges.
2. Advance process, maintenance, and consumable timers.
3. Move completed work into output buffers when capacity allows.
4. Dispatch conveyor packets or loader-arm actions when source, target, and route rules allow.
5. Advance in-flight packets.
6. Accumulate waiting, blocking, utilization, output, and capacity evidence.
7. Recompute line summary, bottleneck classification, and report state.

Deterministic ordering keeps a scenario reproducible and gives the AI assistant a report it can explain without becoming part of the simulation engine.

## Industrial Snapshot

The normalized `1.0` snapshot contains:

- source, generation time, and monotonic sequence;
- assets with stable `assetId`, canvas `nodeId`, and ISA-95-style equipment path;
- PLC mode, run/ready/fault flags, heartbeat, and program state;
- bounded machine action and cycle context;
- sensors with value, unit, quality, tag path, and timestamp;
- actuators with kind, command, feedback, interlock, quality, and timestamp;
- alarms with known asset references, code, severity, state, source, and timestamps.

See [Industrial integration](INDUSTRIAL_INTEGRATION.md) for the contract and commissioning workflow.

## AI Request Path

The optional assistant follows a closed path:

```text
current report + top nodes + active alarms + user question
  -> field and length bounds
    -> per-session concurrency and rate checks
      -> daily estimated-token budget check
        -> exact-request cache
          -> DeepSeek V4 Flash, non-thinking JSON mode
            -> schema and action allowlist sanitization
              -> answer plus manual simulator-only proposals
```

Failure or missing configuration falls back to deterministic local rules. See [Bounded AI assistant](AI_ASSISTANT.md).
