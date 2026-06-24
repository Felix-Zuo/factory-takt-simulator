# Project History

This document records the sanitized public evolution of Factory Takt Simulator. It is intended for portfolio review and technical orientation. It is not a complete private-work log, not a customer deployment record, and not a fabricated git chronology.

## Product Direction

Factory Takt Simulator started as a local decision tool for checking line balance before changing a production route. The public version is deliberately generalized around Process A/B/C, finishing, QA, merge, join, and packing modules so the same engine can describe different discrete-manufacturing workflows without revealing a real product family.

The product priorities are:

1. Stable local operation.
2. Clear process modeling and scenario management.
3. Trustworthy takt, buffer, transfer, and bottleneck feedback.
4. Visual polish that helps users inspect the line rather than hiding the model.

## Evolution

### Phase 1: Visual Takt Sandbox

- Built a drag-and-connect canvas for process modules.
- Added input/output ports, node parameters, edge labels, and live line metrics.
- Introduced calculated takt mode for process time, batch size, availability, and yield.

### Phase 2: Transfer And Buffer Modeling

- Added conveyors, loader-arm buses, dispatch interval, travel time, route shape, and line-buffer capacity.
- Added port rules for material filtering, batch limits, blocked behavior, priority, and routing strategy.
- Added storage, feeder, dryer, merge, join, inspection, and packing abstractions.

### Phase 3: Simulation And Diagnostics

- Added live simulation with waiting, blocking, processing, maintenance, and consumable-change states.
- Added background simulation for target time / target output checks.
- Added bottleneck ranking, stage recognition, line-balance analysis, and report generation.

### Phase 4: Local-First Product Shell

- Added local scenario save/load/import/export and automatic recovery.
- Added Electron packaging hooks for a Windows portable build.
- Added a browser-side `FactoryTaktAgent` bridge for external automation and inspection.
- Added screenshot-based smoke coverage for the main user flow.

### Phase 5: Public Showcase Generalization

- Replaced product-family-specific process names with generic Process A/B/C, Finishing A/B, QA, Merge, Join, Fasten, Fill, Press, Surface, and Pack modules.
- Rebuilt public scenario JSON as synthetic examples.
- Added legacy scenario hydration so older sanitized exports can still map to the generic device schema.
- Fixed a default full-line edge configuration issue where `shape` was written instead of the runtime `edgeShape` field.
- Updated README, report examples, diagrams, and smoke checks to match the generic public product.

### Phase 6: Public Product Page

- Reworked the in-app project overview into a direct public product page.
- Added `?view=showcase` routing for GitHub Pages and external portfolio links.
- Added a compact product-page header so visitors can move from overview to workbench without seeing internal simulator controls first.
- Added a GitHub Pages deployment workflow for the static Vite build.

### Phase 7: Product Showcase Design Benchmarking

- Reviewed public pages for industrial simulation tools and high-quality developer products.
- Rebuilt the showcase hero around a full-bleed real workbench screenshot instead of a split text/media card.
- Added a documented design benchmark note so the public presentation has a traceable design rationale.
- Alternated dark product-surface sections with light documentation-style sections to improve scanning and reduce visual monotony.

### Phase 8: Full-Line Template Hardening

- Promoted the public template to the same synthetic 43-node full-line example used by the workbench.
- Fixed split-feeder inventory accounting so source stock is not overwritten by per-port output buffers.
- Added smoke coverage for feeder continuity and complete multi-port template rules.

## Public Data Rules

- Use synthetic device names and route IDs.
- Use Process A/B/C or similar generic names for line stages.
- Keep travel time, takt, buffer, and capacity values illustrative unless explicitly cleared for release.
- Remove customer names, operator names, real line numbers, private takt targets, and raw factory files.
- Prefer small, readable templates over bulk exports from private workspaces.

## Current Public Version

`0.6.3-beta` is the hardened public showcase version with the benchmark-informed product page, a complete synthetic full-line template, and feeder-continuity regression coverage.
