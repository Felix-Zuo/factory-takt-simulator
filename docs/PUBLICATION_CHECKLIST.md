# Publication Checklist

Use this before making the repository public.

## Metadata

- [ ] Replace `YOUR_ORG` in `package.json`.
- [ ] Confirm package name and description.
- [ ] Confirm license choice.
- [ ] Confirm README screenshots, if added, do not expose private data.

## Source Safety

- [ ] No `.env` files.
- [ ] No API keys, tokens, passwords, or account names.
- [ ] No private customer or factory identifiers.
- [ ] No generated release binaries.
- [ ] No large screenshots or temporary reports.
- [ ] No `node_modules`, `dist`, or Electron packaged output.

## Verification

```bash
npm install
npm run build
npm run lint
npm run maintain:check
```

## GitHub Setup

1. Create an empty GitHub repository.
2. Initialize this showcase folder as the repository root.
3. Commit the current files.
4. Add the GitHub remote.
5. Push `main`.
6. Check the GitHub Actions result.

Do not push from the internal working project unless you intentionally want to publish the internal tree.
