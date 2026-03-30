# v0.1.0

First public release of `LinkedIn Job Match`.

## Highlights

- Resume persistence until replaced or removed
- LinkedIn single-job and list-page analysis
- Inline match badges directly on LinkedIn
- Provider-specific settings for OpenAI, Gemini, Poe, Anthropic, OpenRouter, and Custom endpoints
- Local caching by `jobId + resumeHash`
- Netherlands sponsorship checks with `KM` badge support
- Job metadata badges for language, required experience, and required languages
- Re-analyze controls for current jobs and shown job lists

## Installation

1. Download the release archive
2. Extract it locally
3. Open `chrome://extensions/`
4. Enable `Developer mode`
5. Click `Load unpacked`
6. Select the extracted extension folder

## Notes

- API keys are not bundled with the extension
- Results may vary by provider and model choice
- Sponsor data is derived from the public IND recognised sponsor register and included with attribution
