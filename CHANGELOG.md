# Changelog

## 0.8.0

- Added a normalized industrial snapshot contract and local gateway for bounded PLC, sensor, actuator, machine-action, alarm, and MES context.
- Added Ignition 8.3 / Sepasoft and MQTT Sparkplug B integration presets, an ingest example, SSE streaming, strict payload bounds, origin controls, and authenticated ingestion.
- Added a live digital-twin console with asset, alarm, bounded AI, and connection views mapped directly to canvas nodes.
- Added optional DeepSeek V4 Flash analysis with server-only credentials, non-thinking JSON output, response sanitization, rate limits, daily token budgets, exact-request caching, and deterministic local fallback.
- Kept industrial commands disabled by default and separated preview from operator-authenticated execution, explicit confirmation, downstream interlocks, and audit responsibility.
- Fixed live alarm-to-node binding, 1280px toolbar overflow, and three overlapping node pairs in the full-line template.
- Rebuilt the product page around the industrial-twin workflow and added a reduced-motion-aware five-state interaction recording.
- Added gateway tests and CI coverage for health, authenticated ingestion, payload sanitization, disabled commands, and closed AI configuration.

## 0.7.0

- Reframed the product page around manufacturing decisions and real product evidence, removing self-referential showcase copy and unstable headline metrics.
- Made the product navigation fit on mobile and aligned the brand name across the public page, intro, and workbench.
- Opened the full-line example in a canvas-focused layout, added responsive bottom telemetry, and replaced misleading stopped-state text with ready / paused / running semantics.
- Added bounded scenario validation for malformed graphs, dangling routes, duplicate IDs, invalid coordinates, unsafe settings, and oversized JSON before any imported data is hydrated.
- Added browser regression coverage for import rejection, focused template layout, and 1440px telemetry overflow.
- Refreshed the README, product screenshots, roadmap, scenario contract, release presentation, and canonical Apache-2.0 license.

## 0.6.6-beta

- Added graph-aware port orientation so return-flow process cards automatically render right-in and left-out without routing links through cards.
- Increased the synthetic full-line template column spacing from 170px to 220px so transfer paths and moving material remain visible between stations.
- Added browser regression coverage for forward/reverse port sides, return-flow spacing, and the existing feeder-continuity path.
- Refreshed public showcase screenshots to match the corrected full-line workbench.

## 0.6.5-beta

- Removed node-level scan-light and aura layers that spilled outside process cards in showcase animation mode.

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
