# v0.1.1

`v0.1.1` is the first scoring-system and evaluation-controls upgrade for `LinkedIn Job Match`.

## Highlights

- Unified `Analysis mode` with four presets:
  - `Strict`
  - `Balanced`
  - `Potential`
  - `Sponsorship-first`
- New `I need employer sponsorship` switch so the user explicitly controls whether sponsorship should affect scoring
- Deterministic Netherlands sponsorship outcomes instead of relying on free-form model scoring
- Sponsorship states surfaced in the UI:
  - `Supported`
  - `Hard blocker`
  - `Conflicting signals`
  - `Not needed`
- `Enable full custom scoring`
  - custom weights
  - full custom prompt override
  - additional prompt instructions
- Better debug visibility for:
  - raw score
  - final score
  - sponsorship hard blockers
  - timings and diagnostics
- Cache isolation by:
  - resume
  - scoring profile
  - prompt version
  - model configuration

## User-facing improvements

- clearer distinction between raw score and final score
- visible `Blocked` badge when the final score is forced to `0`
- provider-specific settings remain isolated per provider
- improved analysis controls for advanced users without removing a simple preset flow

## Sponsorship behavior in v0.1.1

- In `Balanced`, `Strict`, and `Potential`, sponsorship is one scoring dimension and does not automatically zero the whole result
- In `Sponsorship-first`, explicit sponsorship incompatibility can hard-block the final score
- If the JD explicitly says sponsorship is not offered, sponsorship fit is forced to `0`
- If the JD and IND registry disagree, the extension shows `Conflicting signals` instead of pretending the outcome is clean

## Notes

- Existing older caches may not be reused because cache context is now stricter
- This version is focused on scoring quality, controls, and explainability rather than a major UI redesign
