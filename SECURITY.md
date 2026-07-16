# Security Policy

Factory Takt Simulator is local-first. The static workbench stores scenarios in browser or Electron local storage. The optional industrial gateway is a site-side reference service and must not be exposed directly to an untrusted network.

## Supported Versions

Security fixes are handled on `main` and the latest stable release.

| Version | Supported |
| --- | --- |
| 0.8.x | Yes |
| 0.7.x | Critical fixes only |
| Older versions | No |

## Reporting A Vulnerability

Use [GitHub private security advisories](https://github.com/Felix-Zuo/factory-takt-simulator/security/advisories/new) for sensitive issues. Do not open a public issue for data exposure, authentication bypass, command execution, prompt injection with security impact, exploitable dependency findings, Electron packaging issues, or update-chain weaknesses.

Use the public bug template for non-sensitive product defects.

## Public Data Boundary

- Do not commit customer names, operator names, real route IDs, machine addresses, production plans, private takt targets, credentials, certificates, tokens, or raw factory files.
- Treat scenario JSON, industrial events, reports, and AI questions as untrusted input.
- Keep screenshots and recordings synthetic unless they have been reviewed for public release.
- Store plant and AI secrets only in the site's secret manager or ignored `.env.local`; never place them in browser code or scenario files.

## Industrial Network Boundary

- Keep PLC connectivity at the plant edge. Do not expose PLC, OPC UA, Ignition, MES, or broker endpoints to the public internet for this application.
- Terminate TLS, identity, rate limiting, audit logging, and network policy in approved site infrastructure.
- Restrict CORS to known workbench origins and use independent high-entropy ingest and operator tokens.
- Bound stream clients and upstream response sizes; monitor repeated reconnects and stale-stream state.
- Map vendor addresses inside the edge adapter. The browser contract receives semantic paths and approved values only.
- Treat this gateway as visualization and decision support, never as a safety function.

## Command Boundary

- `INDUSTRIAL_ALLOW_COMMANDS=false` is the default.
- Preview does not execute a command.
- Execution requires an allowlisted asset and command, a non-expired one-time preview, an independent operator token, and exact confirmation.
- The downstream MES/SCADA adapter must still enforce user authorization, machine mode, PLC interlocks, safety state, rate limits, idempotency, and audit history.
- AI has no industrial command tool and cannot acknowledge alarms, reset faults, or write tags.

## AI Boundary

- API keys are server-side only.
- The model, base URL, prompt, context fields, response schema, action list, output tokens, per-session calls, concurrency, cache TTL/size, and daily token budget are bounded.
- Report and question content is treated as data, not instructions.
- AI output is advisory and simulator actions require explicit user approval.

## Dependency And Release Hygiene

```bash
npm run build
npm run lint
npm run test:gateway
npm run maintain:check
npm audit --omit=dev
npm run test:smoke
```

Production dependency audit must be clean before release. Development dependency findings must be fixed or tracked with a clear issue and risk statement.
