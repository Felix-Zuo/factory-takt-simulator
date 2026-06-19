# Contributing

This repository is a public, sanitized showcase for Factory Takt Simulator. Contributions should improve the generic product without exposing private factory details.

## Local Setup

```bash
npm install
npm run dev
```

## Required Checks

Run these before opening a pull request:

```bash
npm run build
npm run lint
npm run maintain:check
npm audit --omit=dev
```

Run browser smoke coverage when changing canvas behavior, scenario loading, reports, settings, or the toolbar:

```bash
npm run start:local
FACTORY_TAKT_URL=http://127.0.0.1:5173 npm run test:smoke
```

## Code Guidelines

- Keep simulation rules in `src/lib` and shared model types in `src/types/factory.ts`.
- Prefer focused helpers over adding more unrelated behavior to large UI components.
- Keep scenario import/export backward-compatible where practical.
- Keep public process naming generic: Process A/B/C, Finishing, QA, Merge, Join, Pack.
- Add or update smoke checks for user-visible workflow changes.
- Avoid broad refactors unless they remove meaningful complexity or unblock a quality gate.

## Public Data Rules

Do not commit:

- Customer names.
- Operator names.
- Real line, machine, station, or route identifiers.
- Private takt targets, production plans, or capacity commitments.
- Raw exports from a private factory workspace.

Use `docs/PROJECT_HISTORY.md` and `docs/SCENARIO_SCHEMA.md` as the public boundary for showcase content.
