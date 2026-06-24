# Changelog

## 0.6.4-beta

- Fixed brand asset URLs so the intro and header logo load correctly under the GitHub Pages subpath deployment.

## 0.6.3-beta

- Fixed a split storage-feeder simulation bug that could overwrite source inventory after the first material pair was transferred.
- Replaced the lightweight public scenario JSON with the same synthetic 43-node full-line template used by the in-app full-line example.
- Completed generated port rules for multi-output devices so exported templates are self-contained and portable.
- Added smoke coverage for feeder continuity to catch regressions where the default full-line demo stops at startup.

## 0.6.2-beta

- Redesigned the public showcase page after benchmarking industrial simulation and top-tier developer product pages.
- Rebuilt the hero around a full-bleed real workbench screenshot, concise product positioning, and stronger primary actions.
- Added clearer proof, capability, workflow, product-surface, engineering-evidence, roadmap, and documentation sections.
- Introduced a mixed dark/light page structure to reduce visual monotony while keeping the simulator's industrial product identity.
- Added design benchmark notes so the public presentation rationale is visible in the repository.
- Fixed the default public scenario request path for GitHub Pages subpath deployment.

## 0.6.1-beta

- Reworked the in-app project overview into a public product showcase page with direct `?view=showcase` routing.
- Added a compact showcase navigation header so public visitors can move between the product page, simulator, tutorial, and GitHub repository.
- Added GitHub Pages deployment workflow for the Vite static build.
- Added public showcase screenshots under `public/showcase/` so the product page renders correctly after deployment.
- Updated README with the live product-page entrypoint and Pages status badge.

## 0.6.0-beta

- Generalized the public showcase from a domain-specific line into a reusable Process A/B/C, Finishing, QA, Merge, Join, and Packing simulator.
- Rebuilt public scenario examples as synthetic generic templates instead of preserving private-line-derived exports.
- Added `docs/PROJECT_HISTORY.md` as a sanitized product-evolution record for GitHub review.
- Added legacy scenario hydration for older sanitized exports that still use prior device or material names.
- Fixed the full-line conveyor shape setting by writing `edgeShape` instead of the unused `shape` field.
- Refreshed README, report examples, diagrams, and smoke checks around the generic product model.

## 0.5.5-beta

- Verified the current showcase build, lint, and maintainability checks after moving the local repository into the showcase directory.
- Documented that the public build uses synthetic scenarios and generic factory simulation examples.
- Left current maintainability warnings as known follow-up work: `factoryStore.ts`, `FlowEdge.tsx`, `simulation.ts`, and `TopBar.tsx` remain larger than their preferred file-size budgets.

## 0.5.4-beta

- Prepared the project as a cleaner personal showcase build.
- Replaced site-specific default branding with generic Factory Takt Simulator branding.
- Added project overview, development notes, packaging notes, and an agent integration bridge.
- Documented the architecture and scenario model.

Earlier prototypes were iterative local builds.
