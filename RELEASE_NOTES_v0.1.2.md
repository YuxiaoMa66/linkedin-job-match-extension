# v0.1.2

`v0.1.2` expands `LinkedIn Job Match` beyond LinkedIn-only workflows and adds reusable position management inside the side panel.

## Highlights

- New `Library` section with:
  - `History`
  - `Saved`
  - `LinkedIn`
  - `Inserted`
- Saved positions can now be starred and reopened later
- History and saved positions both support in-card detail views with back navigation
- New `Jobs from insert` section for pasted jobs from non-LinkedIn sources
- Users can choose either:
  - `Rule detect`
  - `Model detect`
  when extracting fields from pasted job text
- Inserted jobs can now be:
  - analyzed
  - re-analyzed
  - edited
  - deleted
  - saved
  - reopened from history
- Single history entries and single saved entries can now be removed individually

## User-facing improvements

- `Library` is placed above inserted jobs and list mode
- `Inserted jobs` is placed above list mode
- detail views no longer auto-scroll the side panel to the bottom
- inserted-job wording is clearer and focused on current inserted analyses instead of historical storage
- manual job analysis now behaves more like LinkedIn list-mode analysis

## Why this release matters

This version makes the extension useful beyond native LinkedIn pages:

- users can analyze jobs pasted from company sites, job boards, or other sources
- users can keep a reusable shortlist of saved positions
- users can revisit prior analyses without re-running everything

## Notes

- `History` remains scoped to the current resume and current scoring context
- `Saved` is position-level and can outlive the current analysis session
- users should still load the built `dist/` folder or the extracted release package, not the repository source root
