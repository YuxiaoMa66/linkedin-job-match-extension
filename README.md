[中文](./README.zh-CN.md) | **English**

# LinkedIn Job Match

`LinkedIn Job Match` is a Chrome Manifest V3 extension that compares a user's resume with LinkedIn job descriptions, calculates structured match scores, and adds Netherlands sponsorship signals directly inside LinkedIn.

Current release metadata:

- Extension name: `LinkedIn Job Match`
- Current manifest version: `0.1.0`
- Tech stack: `Chrome Extension MV3 + Vite + Vanilla JavaScript`

## Extension Snapshot

This is how the extension currently appears in Chrome:

![Plugin card screenshot](./Screenshot/plugin.png)

## Overview

This project is designed for users who want faster job screening on LinkedIn.

It can:

- extract job descriptions from LinkedIn job detail pages and search result pages
- persist the uploaded resume locally until the user replaces it
- score job fit with multiple LLM providers
- cache historical results by `jobId + resumeHash`
- show score badges directly inside LinkedIn
- detect job description language, required experience, and required job languages
- perform Netherlands sponsorship checks using a local IND-derived sponsor dataset

## Key Features

### 1. Persistent resume storage

The uploaded resume is stored in `chrome.storage.local` and remains available after:

- page refresh
- side panel reopen
- browser restart

The resume is only replaced when the user uploads a new one or explicitly removes the current one.

### 2. Single-job analysis

On a LinkedIn job detail page, the extension reads:

- job title
- company
- location
- job description text

It then displays the current result in the side panel and can reuse cached results if the same job has already been analyzed for the current resume version.

### 3. List mode analysis

On LinkedIn search result pages, the extension can:

- detect visible job cards on the current page
- analyze the first `N` jobs automatically
- load and show more jobs from the same page
- reuse cached results instead of re-calling the model
- let the user re-analyze the current job or the shown jobs
- open a second-level detail view inside the side panel when a list item is clicked

### 4. Inline LinkedIn badges

The extension injects badges directly into LinkedIn's native UI.

Supported inline signals include:

- overall match score
- `KM` sponsorship marker
- job description language
- required experience
- required job languages

### 5. Multi-provider model support

The settings UI supports separate profiles for providers such as:

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

### LinkedIn page with inline badges and the side panel

This screenshot shows the main day-to-day workflow:

- score badges injected into LinkedIn's native list
- metadata badges such as language, experience, and `KM`
- current job context in the side panel
- cached result reuse in list mode

![Main usage screenshot](./Screenshot/example.png)

### Settings page

This shows the provider settings area where users configure:

- provider
- base URL
- API key
- active model
- saved model list

![Settings screenshot](./Screenshot/settings.png)

### Provider switching

This highlights that the extension supports switching between multiple providers while keeping provider-specific settings.

![Provider switching screenshot](./Screenshot/provider%20switch.png)

### Connection test

This confirms that the selected provider and model can be validated before running analysis.

![Test connection screenshot](./Screenshot/Test%20Connection.png)

### Batch analysis progress

This shows the list-mode analysis flow and progress feedback while multiple jobs are being processed.

![Batch analysis progress screenshot](./Screenshot/clicking%20analyze%20or%20re-analyze.png)

### Detail view

The project also includes a dedicated list-item detail view inside the side panel.

![Detailed analysis screenshot](./Screenshot/specific%20jd%20match%20detail.png)

### Chrome loading procedure

This screenshot can be used in the installation section to show where users should enable developer mode and load the unpacked extension.

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

## Configuration

After opening the side panel:

1. upload a resume in `PDF`, `DOCX`, or `TXT`
2. go to `Settings`
3. choose a provider
4. enter the provider-specific `Base URL`
5. enter the provider-specific `API key`
6. choose an `Active model`
7. optionally add multiple saved models
8. optionally set automatic list analysis count
9. save settings

## Caching Rules

The cache key uses:

- `jobId`
- `resumeHash`

This prevents stale results from being reused when the resume changes.

Other cache behavior:

- already analyzed jobs are loaded from history when possible
- invalid low-quality cached results are filtered out
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
2. create the repository as source code only
3. build locally with `npm run build`
4. zip `dist/`
5. upload the zip as a GitHub Release asset

## License

This project is released under the `MIT` License. See [LICENSE](./LICENSE).
