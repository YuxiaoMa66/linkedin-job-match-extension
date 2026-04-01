# Tester Install Note

If resume upload fails, the most common reason is that the wrong folder was loaded into Chrome.

Correct installation:

1. Open `chrome://extensions/`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the built `dist/` folder, or the extracted GitHub release package folder

Please do **not** load the repository source root directly.

If the source root is loaded instead of `dist/`, the extension UI may still open, but resume upload for `PDF` or `DOCX` files can fail because packaged parser files are missing.
