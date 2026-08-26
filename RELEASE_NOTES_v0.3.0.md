# v0.3.0 — title signals preview

`v0.3.0` is published on the `feature/v0.3.0-title-signals` branch for testing. It is intentionally not merged into `main` yet.

## What changed

- Added separate LinkedIn title capsules for JD language and required language
- Kept KM sponsorship and experience as independent title signals
- Added Default, Color-blind friendly, and Custom colors schemes
- Custom colors can be entered independently for KM, JD language, required language, experience years, and JD keywords
- Added checkboxes for the four core title signals
- Added up to five JD keyword matches with Tag, Bracket, and Spark marker styles
- Reuses a bounded local JD excerpt to recalculate keyword markers after settings changes
- Added README and product-homepage documentation for the new display controls

## Compatibility reminder

The extension still supports LinkedIn's classic Jobs search layout only. If LinkedIn opens AI-powered search, choose `Learn more → Switch back to classic search`, then refresh the page.

## Test path

```bash
npm install
npm run build
```

Load the generated `dist/` folder from `chrome://extensions/` with Developer mode enabled, then open Settings → Title signals.
