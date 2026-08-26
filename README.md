<p align="center">
  <img src="./docs/assets/readme-hero.png" alt="LinkedIn Job Match. Know the fit before you apply." width="100%" />
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a>&nbsp;&nbsp;|&nbsp;&nbsp;<strong>English</strong>
</p>

<p align="center">
  <a href="https://github.com/YuxiaoMa66/linkedin-job-match-extension/releases/tag/v0.2.0"><img alt="Release v0.2.0" src="https://img.shields.io/badge/release-v0.2.0-9a4a30?style=flat-square" /></a>
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-MV3-9a4a30?style=flat-square" />
  <img alt="Vite 5" src="https://img.shields.io/badge/Vite-5-9a4a30?style=flat-square" />
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-9a4a30?style=flat-square" /></a>
</p>

<p align="center">
  A local-first Chrome extension for resume matching, reusable job analysis, inline LinkedIn signals, and Netherlands sponsorship context.
</p>

<p align="center">
  <a href="https://github.com/YuxiaoMa66/linkedin-job-match-extension/releases/download/v0.2.0/linkedin-job-match-v0.2.0.zip"><strong>Download v0.2.0</strong></a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#installation">Installation</a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#configuration">Configuration</a>
</p>

> [!IMPORTANT]
> **Current LinkedIn compatibility**
>
> The current version supports analysis on LinkedIn's **classic Jobs search interface** only. The newer **AI-powered search** interface is not supported yet. If LinkedIn opens AI-powered search, open `Learn more`, choose `Switch back to classic search`, and then refresh the LinkedIn page so the extension can read the classic layout.

<p align="center">
  <img src="./docs/assets/classic-search-switch.png" alt="LinkedIn's Learn more menu with Switch back to classic search highlighted" width="100%" />
</p>

## Screen jobs with the context intact

Match scores and job signals stay inside LinkedIn while the side panel keeps the resume, evidence, history, saved positions, and re-analysis controls together.

![LinkedIn search results with match badges and the LinkedIn Job Match side panel](./Screenshot/example%20v0.1.1.png)

## What It Brings Together

| Capability | What it changes |
| --- | --- |
| Resume-to-role matching | Scores single jobs, visible LinkedIn search results, and jobs pasted from other sources. |
| Inline LinkedIn signals | Adds match scores, JD language, required experience, job languages, and sponsorship markers near the posting. |
| Reusable decision history | Caches compatible analyses, keeps separate LinkedIn and inserted-job history, and saves positions for later review. |
| Provider choice | Supports OpenAI, Anthropic, Gemini, OpenRouter, Poe, and custom OpenAI-compatible endpoints. |
| Netherlands sponsorship context | Checks organisation names against a bundled IND-derived dataset containing 12,927 unique names. |

## What's New In v0.2.0

- Refreshed the bundled IND-derived sponsor dataset from the 2026-08-26 source snapshot
- Bundled 12,927 unique organisation names after collapsing duplicate rows
- Added sponsor dataset revision checks so older local sponsor caches are ignored after an update
- Added a standalone product homepage in `docs/` with the workflow, screenshots, signals, and local install path
- Added GitHub-rendered README links so the Chinese documentation displays correctly

## What's New In v0.1.2

- New `Library` section for:
  - `History`
  - `Saved`
  - `LinkedIn`
  - `Inserted`
- Saved positions can now be starred and revisited later
- History and saved items open in an in-card secondary detail view with a back button
- Inserted jobs now have their own section above list mode
- Users can paste jobs from other sources and choose:
  - `Rule detect`
  - `Model detect`
- Inserted jobs can be analyzed, re-analyzed, edited, saved, deleted, and reopened from history
- Single history entries and saved entries can be removed individually
- Detail views no longer auto-scroll the side panel to the bottom when opened

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

### 3. List mode analysis on classic Jobs search

On LinkedIn's classic Jobs search results page, the extension can:

- detect visible job cards on the page
- analyze the first `N` jobs automatically
- load and show more jobs from the same page
- reuse cached results instead of re-calling the model
- re-analyze the current job or the shown jobs
- open a second-level detail view inside the side panel when a list item is clicked

### 4. Library and saved positions

The new `Library` section lets users:

- switch between `History` and `Saved`
- switch between `LinkedIn` and `Inserted`
- reopen prior analyses in an in-card detail view
- remove single history entries
- remove single saved positions

### 5. Inserted jobs

The `Jobs from insert` section supports pasted jobs from other sources.

Users can:

- paste raw job text
- choose `Rule detect` for fast local extraction
- choose `Model detect` for AI-assisted structuring
- review detected fields
- save and analyze the inserted job
- reopen inserted job results later

### 6. Inline LinkedIn badges

The extension injects badges directly into LinkedIn's native UI.

Supported inline signals include:

- overall match score
- `KM` sponsorship marker
- JD language
- required experience
- required job languages

### 7. Multi-provider model support

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

### Analysis mode and scoring controls

This shows the scoring controls introduced in the recent scoring upgrade.

![Analysis mode screenshot](./Screenshot/Analysis%20mode.png)

![Analysis preference screenshot](./Screenshot/Analysis%20preference%20setting.png)

![Full custom scoring screenshot](./Screenshot/full%20custom%20scoring%20setting.png)

### Library: history and saved positions

This shows the new `Library` section with reusable analysis history and saved jobs.

![Library screenshot](./Screenshot/history%20and%20save.png)

### Inserted jobs

This shows the `Jobs from insert` workflow for pasted jobs from non-LinkedIn sources.

![Inserted jobs screenshot](./Screenshot/insert.png)

### Sponsorship required vs. not required

This demonstrates how sponsorship logic changes when the user explicitly says sponsorship is required or not required.

![Sponsorship required screenshot](./Screenshot/if%20need%20sponsorship.png)

![Sponsorship not required screenshot](./Screenshot/ifnot%20need%20sponsorship.png)

### Breakdown view

This shows the detailed per-dimension scoring output.

![Breakdown screenshot](./Screenshot/breakdown.png)

### Settings and provider switching

These screenshots show provider setup, model configuration, connection testing, and provider-specific settings.

![Settings screenshot](./Screenshot/settings.png)

![Provider switching screenshot](./Screenshot/provider%20switch.png)

![Test connection screenshot](./Screenshot/Test%20Connection.png)

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

### Option B: Install from a GitHub release asset

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

## Privacy and Data Handling

- resume content is stored in local extension storage
- API keys are stored in local extension storage
- model requests are only sent to the currently selected provider
- sponsorship checks use the bundled local sponsor dataset

For data attribution guidance, see [DATA_ATTRIBUTION.md](./DATA_ATTRIBUTION.md).

## License

This project is released under the [MIT License](./LICENSE).
