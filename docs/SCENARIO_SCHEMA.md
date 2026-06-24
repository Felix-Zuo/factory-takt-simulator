# Scenario JSON Notes

Scenario exports are local-first JSON documents.

## Top-Level Shape

```json
{
  "version": "0.6.3-beta",
  "name": "Example line",
  "nodes": [],
  "edges": [],
  "settings": {},
  "records": []
}
```

The exact fields may evolve before a stable `1.0.0` release. Treat exported JSON as a practical interchange format, not a finalized standard.

## Node Guidelines

Each node should include:

- Stable `id`
- `type`
- `position`
- `data.label`
- `data.params`

## Edge Guidelines

Each edge should include:

- Stable `id`
- `source`
- `target`
- Optional source and target handles
- `data.label`
- `data.transportType`
- Optional `data.edgeShape`
- Optional transfer fields such as `dispatchIntervalSec`, `travelTimeSec`, `batchSize`, `pickCount`, `triggerBatch`, and `lineBufferCapacity`

## Public Sharing Rules

Before adding a scenario to the repository:

- Remove customer names.
- Remove factory-specific line numbers unless they are synthetic.
- Remove operator names.
- Remove private takt targets or internal production plans.
- State clearly whether the scenario is synthetic.
- Prefer generic stage names such as Process A/B/C, Finishing, QA, Merge, Join, and Pack.
- Keep multi-port devices self-contained with complete `inputPortRules` and `outputPortRules`.
