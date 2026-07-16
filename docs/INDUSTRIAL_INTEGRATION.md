# Industrial Integration

Factory Takt Simulator 0.8 adds a standards-first integration boundary for live production visualization. The public demo remains synthetic; a plant deployment connects through the local industrial gateway and never lets browser code talk directly to a PLC.

## Reference Solution

The supplied preset targets this common stack:

1. PLCs, machine controllers, sensors, valve islands, drives, and safety controllers expose approved process values to an **Ignition 8.3 Gateway** through OPC UA or a supported device driver.
2. Ignition tags provide live values, quality, history, and alarms. **Sepasoft MES** supplies ISA-95-style operation definitions, response segments, production results, and equipment context.
3. Ignition Web Dev exposes a normalized read endpoint, or MQTT modules publish Sparkplug B state through the plant broker.
4. The local `server/` gateway validates, bounds, and normalizes the payload before streaming it to the simulator over SSE.
5. The React canvas binds normalized assets to simulation nodes through `nodeId`; equipment state never mutates the simulation graph implicitly.

Official references:

- [Ignition 8.3 OPC UA](https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua)
- [Ignition 8.3 Web Dev](https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/web-dev)
- [Ignition alarm configuration](https://www.docs.inductiveautomation.com/docs/8.3/platform/alarming/configuring-alarms)
- [Sepasoft operations definitions](https://docs.sepasoft.com/articles/user-manual/operations-definition)
- [Sepasoft response objects](https://docs.sepasoft.com/articles/user-manual/response-objects)
- [Eclipse Sparkplug specification](https://sparkplug.eclipse.org/specification/)
- [ISA-95 overview](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard)

The Ignition and Sepasoft products are optional reference integrations, not bundled dependencies or endorsements.

## Runtime Boundary

```text
PLC / machine / sensors
  -> OPC UA subscriptions or device drivers
    -> Ignition tags, alarms, historian
      -> Sepasoft MES operation context (optional)
        -> HTTPS normalized snapshot or MQTT Sparkplug B adapter
          -> Factory Takt Industrial Gateway
            -> validated snapshot + SSE
              -> digital twin canvas and bounded AI context
```

For routed or cloud environments, keep PLC connectivity at the site edge. Publish approved telemetry outward; do not expose PLC endpoints to the public internet.

## Start The Gateway

```powershell
Copy-Item .env.example .env.local
npm run gateway
```

The default listener is `http://127.0.0.1:8787`. Configure the canvas from **Live Digital Twin > Connect**. `.env.local` is ignored by Git.

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

## Normalized Snapshot Contract

Sources may push a complete snapshot to `POST /api/industrial/events` with `Authorization: Bearer <INDUSTRIAL_INGEST_TOKEN>`.

```json
{
  "schemaVersion": "1.0",
  "source": "ignition",
  "generatedAt": "2026-07-16T08:00:00.000Z",
  "sequence": 42,
  "assets": [],
  "alarms": []
}
```

The gateway enforces:

- 256 KiB body limit.
- 500 assets, 1,000 alarms, 64 sensors and 64 actuators per asset.
- Unique asset IDs and alarm references to known assets.
- Bounded text and numeric values.
- Explicit state enums and signal quality.
- Exact origin allowlisting, ingest authentication, bounded upstream responses, and in-memory-only state by default.
- A configurable SSE client cap (`INDUSTRIAL_MAX_SSE_CLIENTS`, default 32).

The browser rejects malformed nested asset, sensor, actuator, alarm, AI, and command-preview payloads. It also marks a live stream as degraded when no fresh snapshot arrives for 10 seconds, while retaining the last accepted state for diagnosis.

See [industrial-snapshot.example.json](../integration/examples/industrial-snapshot.example.json) and [ignition-sepasoft.json](../integration/presets/ignition-sepasoft.json).

## Recommended Tag Model

Use stable semantic paths instead of raw register addresses in the browser contract:

```text
[default]Enterprise/Site-A/Area-01/Line-01/PROC-A/PLC/Mode
[default]Enterprise/Site-A/Area-01/Line-01/PROC-A/PLC/Run
[default]Enterprise/Site-A/Area-01/Line-01/PROC-A/PLC/Fault
[default]Enterprise/Site-A/Area-01/Line-01/PROC-A/Action/State
[default]Enterprise/Site-A/Area-01/Line-01/PROC-A/DI/PartPresent
[default]Enterprise/Site-A/Area-01/Line-01/PROC-A/DO/ClampValve/Cmd
[default]Enterprise/Site-A/Area-01/Line-01/PROC-A/DO/ClampValve/Fbk
```

Map vendor addresses only inside the edge gateway. Include source timestamps and OPC quality on every signal.

## Command Safety

Read paths and command paths are deliberately separate.

- `INDUSTRIAL_ALLOW_COMMANDS=false` by default.
- The UI can request a command preview but does not execute it.
- Execution requires an allowlisted asset, a non-expired one-time preview, a server-side operator token, and an exact confirmation header.
- A downstream MES/SCADA adapter remains responsible for authorization, PLC interlocks, mode checks, and audit history.
- The AI endpoint has no industrial command tool and cannot call the execution route.

Do not use this reference gateway as a safety function. PLC and safety-controller logic remain authoritative.

## Site Commissioning Checklist

- Establish the ISA-95 equipment hierarchy and stable `nodeId` mapping.
- Verify OPC UA certificates, encryption, roles, and read/write permissions.
- Confirm sampling intervals, deadbands, queue sizes, timestamps, and bad-quality behavior.
- Reconcile machine action states with the PLC sequence and HMI terminology.
- Test valve command/feedback mismatch, stuck sensor, stale heartbeat, and communication-loss alarms.
- Set an update interval comfortably below the 10-second stale-stream threshold, or adjust the adapter design before commissioning.
- Validate MES operation IDs, material lots, counts, quality dispositions, and changeover states.
- Run read-only shadow mode before considering any command adapter.
- Complete factory acceptance testing, security review, backup, rollback, and operator training.
