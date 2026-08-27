# Tester Install Note — v0.5.0

`v0.5.0` adds tested support for the Netherlands Indeed jobs list while retaining LinkedIn Classic and AI-powered Search.

If resume upload fails, the most common reason is that the wrong folder was loaded into Chrome.

Correct installation:

1. Open `chrome://extensions/`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the built `dist/` folder, or the extracted GitHub release package folder

Please do **not** load the repository source root directly.

If the source root is loaded instead of `dist/`, the extension UI may still open, but resume upload for `PDF` or `DOCX` files can fail because packaged parser files are missing.

## Updating the existing installation without losing data

To preserve data from v0.1.2 onward, do not load the new extracted ZIP as another folder:

1. In `chrome://extensions/`, open the existing extension's `Details` and copy its `Location`.
2. Back up the original extension folder.
3. Extract `linkedin-job-match-v0.5.0.zip` to a temporary folder, or build and use the repository's `dist/` folder.
4. Copy the package contents into the existing `Location`, replacing the old files. Keep the original folder path unchanged and do not create a nested `dist/` folder.
5. Click `Reload` on the existing extension card.
6. Refresh the LinkedIn or Indeed tab and reopen the side panel.

Loading the new folder with `Load unpacked` creates a separate extension ID and separate local storage. Updating the original folder keeps the existing config, resume, saved/manual positions, and v0.1.2+ cache snapshots. It does not turn previously unanalysed jobs into analysed jobs.

The reason is that Chrome scopes `chrome.storage.local` to the extension ID. A ZIP cannot update an unpacked extension by itself; replacing files in the original `Location` keeps the existing extension entry and its data.

## v0.5.0 checks

1. Open `https://nl.indeed.com/` or an Indeed jobs search/list page.
2. Refresh the page after the extension reload and confirm the side panel shows `Jobs on this page` with `Indeed` source pills and detected cards.
3. Click several Indeed cards from the side panel and confirm the selected detail and JD change with the job.
4. Confirm the Indeed job title, company, location, and JD are shown in the current-page card.
5. Upload a resume, analyze one Indeed job, and confirm its score/capsules appear in the page and side panel.
6. Re-analyze the shown Indeed jobs, then refresh the page and confirm the list and cached results can be read again.
7. Open `Library` and confirm Indeed history/saved positions are separate from LinkedIn and Inserted.
8. Switch to LinkedIn AI-powered Search and Classic Search and refresh once to verify both existing adapters still work.

The v0.5.0 Indeed adapter was smoke-tested on the Netherlands Indeed homepage recommendation list. Indeed's DOM can vary by experiment and page state, so report the page URL and visible layout if a particular search page behaves differently.
