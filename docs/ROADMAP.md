# Roadmap

This roadmap keeps the public project useful as a generic industrial-twin reference without pretending that one public preset is a commissioned plant integration.

## 0.8.0 Industrial Twin Release

- Ship the normalized `1.0` industrial snapshot and SSE gateway.
- Provide Ignition 8.3 / Sepasoft and MQTT Sparkplug B reference presets.
- Map PLC mode, machine action, sensors, actuators, quality, heartbeat, and alarms to canvas nodes.
- Add bounded DeepSeek V4 Flash analysis with local zero-cost fallback.
- Keep industrial commands disabled by default and outside the AI tool surface.
- Keep the product page, interaction recording, README, architecture, security policy, and CI aligned with the release.

## 0.9.x Site Adapter Toolkit

- Add a focused adapter test harness for real Ignition Web Dev and Sparkplug payload samples.
- Add mapping diagnostics for missing tags, stale timestamps, bad quality, duplicate assets, and unknown alarms.
- Add historical trend and event-replay inputs without turning the browser into a historian.
- Add report comparisons that separate simulated constraints from observed live symptoms.
- Document reverse-proxy, certificate, secret rotation, audit, backup, and rollback patterns for a site deployment.

## Product Quality

- Add focused unit coverage for takt math, port rules, scenario hydration, twin mapping, and bottleneck classification.
- Split large modules that exceed the maintainability budget.
- Improve keyboard-driven canvas workflows and accessibility labels.
- Add responsive visual regression coverage for the twin console and public product page.
- Keep build, lint, gateway tests, production audit, maintainability checks, browser smoke, CI, and Pages green for every stable release.

## Explicitly Not Planned

- Direct browser-to-PLC or browser-to-OPC-UA connections.
- Safety control, safety acknowledgement, or automatic fault reset.
- AI-generated PLC writes or automatic execution of model proposals.
- Bundled customer routes, machine addresses, credentials, production plans, or raw factory exports.
- A claim that the public preset is universally deployable without site mapping, security review, shadow-mode validation, and factory acceptance testing.
