# Quality Model

Factory Takt Simulator is treated as a local-first engineering tool. Quality is measured by whether a user can build a scenario, trust the model, inspect the result, and safely share a sanitized public artifact.

## Quality Gates

| Gate | Command | Purpose |
| --- | --- | --- |
| Type/build | `npm run build` | Compile TypeScript and build the Vite app. |
| Lint | `npm run lint` | Catch code-style and React hook issues. |
| Maintainability | `npm run maintain:check` | Track large files and removed 3D dependencies. |
| Production audit | `npm audit --omit=dev` | Keep runtime dependency surface clean. |
| Browser smoke | `npm run test:smoke` | Verify main canvas, scenario, animation, settings, and report workflows. |

## Current Known Debt

The maintainability check currently reports size warnings for:

- `src/store/factoryStore.ts`
- `src/components/layout/TopBar.tsx`
- `src/components/canvas/FlowEdge.tsx`
- `src/lib/simulation.ts`

These are tracked as refactor candidates. They are not release blockers when build, lint, audit, and smoke checks pass.

## Bug Triage

Treat the following as high priority:

- Incorrect takt or capacity calculations.
- Broken scenario import/export compatibility.
- Public assets containing private factory data.
- Electron packaging or update-chain security regressions.
- Canvas states that block normal editing, linking, or inspection.

## Public Asset Review

Before committing README screenshots, reports, diagrams, or scenario JSON:

1. Verify names are generic.
2. Verify the asset can be understood without private context.
3. Run the smoke test after screenshot or scenario refresh.
4. Use the scenario sanitization issue template when the asset is derived from real work.
