# Tester Install Note — v0.3.1 branch

This preview is on `feature/v0.3.1-title-signals`. It is not merged into `main`.

If resume upload fails, the most common reason is that the wrong folder was loaded into Chrome.

Correct installation:

1. Open `chrome://extensions/`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the built `dist/` folder, or the extracted GitHub release package folder

Please do **not** load the repository source root directly.

If the source root is loaded instead of `dist/`, the extension UI may still open, but resume upload for `PDF` or `DOCX` files can fail because packaged parser files are missing.

## v0.3.1 checks

1. Open the side panel's `Settings` tab and find `Title signals`.
2. Confirm the four default title signals are checked.
3. Choose `Color-blind friendly`, save, and confirm the visible title capsules change palette.
4. Choose `Custom colors`, set a different hex color for each capsule, save, and confirm each capsule keeps its own color.
5. Confirm `Show matched keywords beside the job title` starts unchecked. Add up to five JD keywords, enable the switch, and test `Tag`, `Bracket`, and `Spark` marker styles.
6. Select OpenAI, Anthropic, and Gemini one by one. Confirm the fixed starter model is inserted into the editable `Saved models` field, then add another model manually and save.
7. On a classic LinkedIn Jobs page, switch back from AI-powered search if needed, then refresh the page.
