# v0.4.0: AI-powered LinkedIn search support

v0.4.0 adds a tested adapter for LinkedIn's newer AI-powered / semantic Jobs search while retaining the existing Classic Search workflow.

## What's new

- Reads visible AI-powered job cards from LinkedIn's semantic search layout.
- Extracts the stable job ID, title, company, and location from each card.
- Focuses a selected AI-powered card from list analysis and waits for its detail pane.
- Reads the selected job's title, company, location, and JD from the `About the job` section.
- Reuses the existing match cache, title capsules, sponsorship signals, history, and saved-position flow.
- Keeps the Classic Search selectors as a fallback for the same extension.
- Adds the verified AI-powered search screenshot to the repository documentation.

![v0.4.0 AI-powered LinkedIn search with cached list analysis and title capsules](./docs/assets/v0.4.0-ai-powered-search.png)

## Compatibility and refresh

The AI-powered layout is identified by its semantic search URL marker (`origin=SEMANTIC_SEARCH_LANDING_PAGE`) and its current card structure. LinkedIn can re-render either layout as a single-page application, so refresh the LinkedIn tab after updating the extension or switching between AI-powered and Classic Search.

## Update an existing extension without losing data

For an existing v0.1.2+ installation:

1. Open `chrome://extensions/`, open the existing extension's `Details`, and copy its `Location` path.
2. Back up the original extension folder.
3. Extract `linkedin-job-match-v0.4.0.zip` into a temporary folder.
4. Copy the contents inside the extracted package into the original `Location`, replacing the old files. Keep the original folder path unchanged and do not create a nested `dist/` folder.
5. Return to `chrome://extensions/` and click `Reload` on the original extension card.
6. Refresh the LinkedIn tab and reopen the side panel.

Do not load the extracted package as a second unpacked extension. Chrome scopes `chrome.storage.local` to the extension ID; a new folder creates a different ID and separate storage. Updating the original `Location` keeps the existing extension entry, API settings, resume, saved/manual positions, and compatible history.

This release does not rewrite old records. v0.1.2+ analyzed results and older sponsorship snapshots remain displayable for the same resume, while jobs that were never analyzed remain unanalysed. Existing cache expiry rules still apply.

## First installation

1. Download the `linkedin-job-match-v0.4.0.zip` asset below.
2. Extract it.
3. Open `chrome://extensions/`, enable `Developer mode`, and choose `Load unpacked`.
4. Select the extracted extension folder containing `manifest.json`.

## Verification

```bash
npm install
npm run build
```

The release package is built from `main` and is intended to be loaded from the extracted package folder, not from the repository source root.
