# v0.3.1 — title signals and provider starters

`v0.3.1` is a testing preview on `feature/v0.3.1-title-signals`. It is intentionally not merged into `main`.

## Changes

- Keyword title markers are now opt-in and start unchecked.
- Added a clear keyword enable switch alongside the five keyword inputs.
- Added fixed low-cost starter models when selecting OpenAI, Anthropic, or Gemini:
  - `gpt-5-mini`
  - `claude-haiku-4-5-20251001`
  - `gemini-3.5-flash-lite`
- Saved models remain editable; users can replace the starter or add additional model IDs.
- Added the supplied walkthrough screenshots to the README and product documentation.
- Bumped the extension and package version to `0.3.1`.

## Compatibility

The extension still analyzes LinkedIn's classic Jobs search interface only. Switch back from AI-powered search and refresh the page before testing.

## Test build

```bash
npm install
npm run build
```

Load the generated `dist/` directory from `chrome://extensions/`.
