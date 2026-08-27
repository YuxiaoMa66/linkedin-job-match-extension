# v0.3.1: title signals and provider starters

`v0.3.1` is the current main release. This note records the release-level changes; the [README](./README.md) contains the full feature reference, color legend, configuration details, and screenshots.

## Release focus

- Added configurable title capsules for JD language, required language, KM sponsorship, and experience years.
- Added preset palettes, independent custom hex colors, and visibility checkboxes.
- Added optional JD keyword markers for up to five terms, with `Tag`, `Bracket`, and `Spark` styles.
- Added fixed starter models for OpenAI, Anthropic, and Gemini while keeping `Saved models` editable. Legacy `gpt-4o` is hidden without removing user-added model IDs.
- Added v0.1.2+ compatible display reads for cached match and sponsorship history. Stored snapshots are not rewritten, and jobs without an analysis remain unanalysed.

## Compatibility and upgrade

The extension analyzes LinkedIn's classic Jobs search interface only. If LinkedIn opens AI-powered search, choose `Learn more` → `Switch back to classic search`, then refresh the page.

For an existing v0.1.2+ installation, replace the files inside the original Chrome extension `Location` and click `Reload` on the existing card. Loading the extracted ZIP as a new unpacked folder creates a separate extension ID and separate local storage.

## Verification

```bash
npm install
npm run build
```

The release package is built from `main` and should be loaded from its extracted extension folder, not from the repository source root.
