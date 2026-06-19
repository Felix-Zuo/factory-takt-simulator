# Security Policy

Factory Takt Simulator is a local-first simulator. It has no hosted backend by default, stores scenarios in browser/Electron local storage, and exports user-provided scenario JSON locally.

## Supported Versions

Security fixes are handled on the latest public beta branch and `main`.

| Version | Supported |
| --- | --- |
| 0.6.x beta | Yes |
| Older beta builds | Best effort |

## Reporting A Vulnerability

Use GitHub private security advisories for sensitive issues:

https://github.com/Felix-Zuo/factory-takt-simulator/security/advisories/new

Do not open a public issue for:

- Sensitive data exposure.
- Unsanitized factory scenario exports.
- Dependency vulnerabilities with exploitable proof of concept.
- Electron packaging or update-chain security issues.

For non-sensitive quality issues, use the public bug template.

## Project Security Boundaries

- Treat all imported scenario JSON as untrusted input.
- Do not add real customer names, operator names, route IDs, line IDs, private takt targets, or production plans to public assets.
- Keep generated reports and screenshots synthetic unless they have been reviewed for public release.
- Prefer local-only operation. Do not add network sync, remote execution, or telemetry without a security review and explicit documentation.

## Dependency Hygiene

The project uses npm audit as a baseline check:

```bash
npm audit --omit=dev
npm audit
```

Production dependency audit must be clean before release. Development dependency warnings should be fixed promptly or tracked with a clear issue.
