# GitHub Release Checklist

Use this after the project is already on GitHub.

## Before Tagging

- [ ] `npm run build` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run maintain:check` passes.
- [ ] A clean scenario can be created, saved, exported, imported, and simulated.
- [ ] README and changelog describe the release.

## Tag Naming

Use semantic version tags:

```bash
git tag v0.5.4-beta
git push origin v0.5.4-beta
```

## Release Assets

For source releases, GitHub can generate source archives automatically.

For desktop releases, upload packaged builds only after confirming license and distribution requirements. Do not commit packaged binaries into the repository history.
