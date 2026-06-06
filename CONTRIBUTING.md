# Contributing

## Development Setup

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run build
npm run lint
npm run maintain:check
```

## Code Style

- Keep simulation rules in `src/lib/`.
- Keep domain types in `src/types/`.
- Keep UI state mutations in `src/store/`.
- Avoid hard-coding site-specific process names in reusable logic.
- Add comments only where the logic is not obvious.
- Keep example scenarios synthetic and clearly documented.

## Pull Request Checklist

- The change has a clear user-facing reason.
- The simulator still starts in browser mode.
- Scenario import/export still works.
- Existing sample scenarios still load.
- No generated package, `.env`, log, or private file is committed.

## Issue Reports

Useful issue reports include:

- Browser or desktop mode used.
- Steps to reproduce.
- Expected result.
- Actual result.
- Screenshot or exported scenario JSON if possible.
