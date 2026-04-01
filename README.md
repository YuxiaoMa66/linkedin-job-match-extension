[中文](./README.zh-CN.md) | **English**

# LinkedIn Job Match

`LinkedIn Job Match` is a Chrome Manifest V3 extension that compares a resume against LinkedIn job descriptions, shows structured fit results inside LinkedIn, and adds Netherlands sponsorship signals directly on the page.

Current release metadata:

- Extension name: `LinkedIn Job Match`
- Current manifest version: `0.1.1`
- Tech stack: `Chrome Extension MV3 + Vite + Vanilla JavaScript`

## Extension Snapshot

![Plugin card screenshot](./Screenshot/plugin.png)

## What It Does

The extension is built for faster job screening on LinkedIn. It can:

- read job descriptions from LinkedIn detail pages and search result pages
- persist the uploaded resume locally until the user replaces or removes it
- score fit with multiple LLM providers
- cache analysis results by resume, scoring profile, prompt version, and model configuration
- inject match badges and metadata badges directly into LinkedIn
- detect JD language, required experience, and required job languages
- evaluate Netherlands sponsorship signals using a local IND-derived sponsor dataset

## What's New In v0.1.1

- Unified `Analysis mode` with four presets: `Strict`, `Balanced`, `Potential`, and `Sponsorship-first`
- `I need employer sponsorship` switch so users can explicitly decide whether sponsorship should affect scoring
- Deterministic sponsorship scoring instead of letting the model drift on sponsorship outcomes
- `Supported`, `Hard blocker`, `Conflicting signals`, and `Not needed` sponsorship states
- `Enable full custom scoring` with:
  - fully custom weights
  - a full custom prompt override
  - additional prompt instructions
- clearer diagnostics for raw score vs. final score
- a visible `Blocked` badge when a hard sponsorship blocker forces the final score to `0`

## Core Features

### 1. Persistent resume storage

The uploaded resume is stored in `chrome.storage.local` and stays available after:

- page refresh
- side panel reopen
- browser restart

It is replaced only when the user uploads a new one or explicitly removes the current file.

### 2. Single-job analysis

On a LinkedIn job detail page, the extension reads:

- job title
- company
- location
- job description text

It then shows the result in the side panel and reuses cache when the same job has already been analyzed for the same resume and scoring context.

### 3. List mode analysis

On LinkedIn search result pages, the extension can:

- detect visible job cards on the page
- analyze the first `N` jobs automatically
- load and show more jobs from the same page
- reuse cached results instead of re-calling the model
- re-analyze the current job or the shown jobs
- open a second-level detail view inside the side panel when a list item is clicked

### 4. Inline LinkedIn badges

The extension injects badges directly into LinkedIn's native UI.

Supported inline signals include:

- overall match score
- `KM` sponsorship marker
- JD language
- required experience
- required job languages

### 5. Multi-provider model support

The settings UI supports separate profiles for:

- `OpenAI`
- `Anthropic`
- `Gemini`
- `OpenRouter`
- `Poe`
- `Custom`

Each provider keeps its own:

- base URL
- API key
- active model
- saved models
- timeout
- retry settings

## Screenshots

### Main workflow on LinkedIn

This shows score badges injected into LinkedIn, metadata badges, current job context, and list-mode cache reuse.

![Main usage screenshot](./Screenshot/example.png)

### Analysis mode and scoring controls

This shows the new `Analysis mode` section in `v0.1.1`.

![Analysis mode screenshot](./Screenshot/Analysis%20mode.png)

### Analysis preference settings

This shows the main scoring settings area, including the sponsorship requirement toggle.

![Analysis preference screenshot](./Screenshot/Analysis%20preference%20setting.png)

### Full custom scoring

This shows `Enable full custom scoring`, custom weights, and the full custom prompt input.

![Full custom scoring screenshot](./Screenshot/full%20custom%20scoring%20setting.png)

### Sponsorship required vs. not required

This demonstrates how sponsorship logic changes when the user explicitly says sponsorship is required or not required.

![Sponsorship required screenshot](./Screenshot/if%20need%20sponsorship.png)

![Sponsorship not required screenshot](./Screenshot/ifnot%20need%20sponsorship.png)

### Breakdown view

This shows the detailed per-dimension scoring output.

![Breakdown screenshot](./Screenshot/breakdown.png)

### Settings page

This shows provider setup, model configuration, and general settings.

![Settings screenshot](./Screenshot/settings.png)

### Provider switching

This highlights switching between providers while keeping provider-specific settings.

![Provider switching screenshot](./Screenshot/provider%20switch.png)

### Connection test

This shows the connection validation flow before running analysis.

![Test connection screenshot](./Screenshot/Test%20Connection.png)

### Batch analysis progress

This shows list-mode progress feedback while multiple jobs are being processed.

![Batch analysis progress screenshot](./Screenshot/clicking%20analyze%20or%20re-analyze.png)

### Side panel detail view

This shows the dedicated second-level detail view inside the side panel.

![Detailed analysis screenshot](./Screenshot/specific%20jd%20match%20detail.png)

### Chrome loading procedure

This can be used in the installation section to show where users should enable developer mode and load the unpacked extension.

![Chrome extension loading procedure screenshot](./Screenshot/chrome%20procedure.png)

## Repository Structure

```text
assets/                  extension icons and static assets
data/                    IND-derived sponsor data and update script
public/                  build-time copied public files
Screenshot/              README screenshots
src/background/          service worker, cache, config, model integration
src/content/             LinkedIn extraction and badge injection
src/prompts/             prompt templates
src/shared/              shared constants and validation helpers
src/sidepanel/           side panel UI
manifest.json            Chrome extension manifest
package.json             scripts and dependencies
setup_public.js          prepares build assets
vite.config.js           Vite build config
```

## Installation

Important:

- Do not load the project source root folder directly as the extension.
- Always load the built `dist/` folder, or use the GitHub release package and load the extracted extension folder.
- If the wrong folder is loaded, the UI may still open, but resume upload can fail because packaged parser files are missing.

### Option A: Run from source

```bash
npm install
npm run build
```

Then:

1. open `chrome://extensions/`
2. enable `Developer mode`
3. click `Load unpacked`
4. select the `dist/` folder

Reference:

![Chrome extension loading procedure screenshot](./Screenshot/chrome%20procedure.png)

### Option B: Install from a GitHub Release asset

If you publish a release zip:

1. download the release archive
2. extract it
3. open `chrome://extensions/`
4. enable `Developer mode`
5. click `Load unpacked`
6. select the extracted extension folder

Common mistake to avoid:

- GitHub source archives are not the same as the built extension package.
- If someone downloads the repository source and loads the root folder instead of `dist/`, resume parsing for `PDF` or `DOCX` files may fail.

## Configuration

After opening the side panel:

1. upload a resume in `PDF`, `DOCX`, or `TXT`
2. go to `Settings`
3. choose a provider
4. enter the provider-specific `Base URL`
5. enter the provider-specific `API key`
6. choose an `Active model`
7. optionally add multiple saved models
8. choose an `Analysis mode`
9. choose whether `I need employer sponsorship`
10. optionally enable `Full custom scoring`
11. save settings

## Scoring Logic

### Analysis modes

- `Strict`: more conservative scoring for missing must-haves
- `Balanced`: normal general-purpose evaluation
- `Potential`: more credit for transferable upside and growth potential
- `Sponsorship-first`: sponsorship logic can act as a hard blocker

### Sponsorship logic

If the user marks `I need employer sponsorship`, sponsorship becomes part of the evaluation.

`v0.1.1` uses deterministic sponsorship outcomes:

- recognized sponsor and no explicit JD refusal -> strong positive
- recognized sponsor but JD explicitly says no sponsorship -> `0` sponsorship fit
- registry negative but JD suggests sponsorship support -> low score with `Conflicting signals`
- registry negative and JD also indicates no sponsorship -> `0` sponsorship fit

Only `Sponsorship-first` can hard-block the final score to `0` when sponsorship is clearly incompatible.

## Caching Rules

The cache key now isolates by:

- `jobId`
- `resumeHash`
- `scoringProfileHash`
- `modelKeyHash`
- `promptVersion`

This prevents stale results from being reused after changes to the resume, provider, scoring mode, custom weights, or custom prompt.

Other cache behavior:

- already analyzed jobs are loaded from history when possible
- obviously damaged low-quality cached results are filtered out
- job history older than 30 days is removed automatically

## Privacy and Data Handling

- resume content is stored locally in extension storage
- API keys are stored locally in extension storage
- requests are sent only to the selected model provider
- sponsor matching uses a local dataset included in the project

For dataset notes and attribution, see [DATA_ATTRIBUTION.md](./DATA_ATTRIBUTION.md).

## Publishing Notes

This folder is prepared as a clean GitHub upload set.

It intentionally excludes:

- `node_modules`
- local log files
- transient debug files
- the already-built `dist/` folder

Recommended publication workflow:

1. upload this folder's contents into a GitHub repository
2. keep the repository as source code only
3. build locally with `npm run build`
4. zip `dist/`
5. upload the zip as a GitHub Release asset

## License

This project uses the `MIT` License. See [LICENSE](./LICENSE).
