# v0.2.0

`v0.2.0` refreshes the local sponsorship dataset and adds a public-facing product homepage for `LinkedIn Job Match`.

## Highlights

- Refreshed the bundled IND-derived sponsor name list from the 2026-08-26 source snapshot
- Bundled 12,927 unique organisation names after collapsing 8 duplicate rows
- Added sponsor dataset revision checks so an older local `chrome.storage.local` sponsor cache is ignored after an update
- Added a standalone product homepage in `docs/` with the workflow, screenshots, signals, and local installation path
- Added GitHub-rendered README links for reliable English and Chinese documentation display

## Data notes

- The runtime dataset contains organisation names only; KVK numbers from the source workbook are not included in the existing string-array schema
- The source and reuse notes remain documented in `DATA_ATTRIBUTION.md`
- Build and load the generated `dist/` directory rather than the repository source root
