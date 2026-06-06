# Scenario JSON Notes

Scenario exports are local-first JSON documents.

## Top-Level Shape

```json
{
  "version": "0.5.4-beta",
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
- `data.transferType`
- `data.params`

## Public Sharing Rules

Before adding a scenario to the repository:

- Remove customer names.
- Remove factory-specific line numbers unless they are synthetic.
- Remove operator names.
- Remove private takt targets or internal production plans.
- State clearly whether the scenario is synthetic.
