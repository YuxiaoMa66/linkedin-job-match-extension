# v0.3.1 — title signals and provider starters

`v0.3.1` was first published as a testing preview on `feature/v0.3.1-title-signals` and is now merged into `main`.

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
- Removed `gpt-4o` from the visible/default Saved models while preserving user-added model IDs; old stored `gpt-4o` values are normalized to the provider starter model.
- Added v0.1.2+ compatible display reads for cached history when the provider, model, or scoring profile changes. Stored old match and sponsorship snapshots are not rewritten, and jobs without an analysis remain unanalysed.

## Compatibility

The extension still analyzes LinkedIn's classic Jobs search interface only. Switch back from AI-powered search and refresh the page before testing.

## Test build

```bash
npm install
npm run build
```

Load the generated `dist/` directory from `chrome://extensions/`.

For an update, keep the original extension folder and replace its files in place, then click `Reload` on the existing card. Loading a newly extracted folder creates a different extension ID and cannot automatically access the original `chrome.storage.local` data.
