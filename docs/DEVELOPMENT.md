# Development Notes

## Setup

```bash
npm install
npm run dev
```

## Checks

```bash
npm run build
npm run lint
npm run maintain:check
npm audit --omit=dev
```

For user-visible canvas, scenario, report, settings, or toolbar changes, also run:

```bash
npm run start:local
FACTORY_TAKT_URL=http://127.0.0.1:5173 npm run test:smoke
```

## Practical Rules

- Put reusable simulation logic in `src/lib`.
- Put editable domain fields in `src/types/factory.ts`.
- Add new device defaults through `src/data/deviceCatalog.ts`.
- Keep process-specific UI in layout/canvas components.
- Keep exported scenarios synthetic unless there is explicit permission to share real data.
- Do not commit `node_modules`, `dist`, `release`, reports, screenshots, or `.env`.

## Adding A New Device Type

1. Add the device type to `src/types/factory.ts`.
2. Add a catalog entry in `src/data/deviceCatalog.ts`.
3. Add default parameters if needed.
4. Extend takt logic in `src/lib/takt.ts` if the formula is special.
5. Extend simulation behavior in `src/lib/simulation.ts` or a focused helper if needed.
6. Add UI fields in `src/components/layout/ParameterPanel.tsx` only when the field needs editing.

## GitHub Workflow

- Use issues for planned work and bugs.
- Use the scenario sanitization template before adding public scenarios derived from real work.
- Keep pull requests small enough to review, and fill the validation checklist.
- Keep `SECURITY.md` guidance for sensitive reports instead of discussing vulnerabilities in public issues.
