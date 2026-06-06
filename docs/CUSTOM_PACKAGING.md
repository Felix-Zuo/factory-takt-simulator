# Custom Packaging

This project can be packaged as a standalone Windows desktop application.

## Standard Portable Build

```bash
npm install
npm run dist:win
```

Output goes to `release/`.

## Rebranding Checklist

- Replace `public/brand/brand-mark.svg`.
- Replace `public/brand/app-icon.png`.
- Replace `build/icon.ico` and `build/icon.png`.
- Update `productName` and `appId` in `package.json`.
- Update default scenarios if the packaged build should open with a different line.
- Confirm the app title, intro screen, and project overview match the target build.

## Handoff

For a clean handoff, include:

- The portable `.exe` or unpacked portable folder.
- A short usage note.
- Optional example scenario JSON.

Do not include source dependency folders or temporary reports in a handoff package.
