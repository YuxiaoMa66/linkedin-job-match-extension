# Data Attribution and Reuse Notes

This project includes a local sponsor dataset derived from the Dutch Immigration and Naturalisation Service (`IND`) public recognised sponsor register.

Files involved:

- `data/ind-nl-2026-03-11.csv`
- `data/ind_sponsors.json`
- `data/update_sponsors.js`

## Current bundled snapshot

The bundled sponsor name list was refreshed on 2026-08-26 from the supplied `km_sponsorlist_20260826_1858.xlsx` workbook, using the `Organisation` column from `Sheet1`. The workbook contained 12,935 rows and 12,927 unique organisation names; 8 duplicate names were collapsed. KVK numbers are not bundled because the extension's runtime lookup uses a string array of organisation names.

The dataset revision is `2026-08-26-1858`. The extension uses this revision when reading its local cache so an older cached sponsor list is ignored after an update.

## Source

The sponsor list is derived from the public IND recognised sponsor information published on the official IND website:

- [IND website](https://ind.nl/)
- [IND proclaimer](https://ind.nl/en/proclaimer)

## Reuse Note

The current IND proclaimer states that reuse of content is allowed if the source is mentioned.

Because this repository redistributes a derived local dataset, the safest public-release approach is:

1. keep a clear source attribution in this file and in the README
2. mention that the data originates from the IND public register
3. mention the extraction date where possible
4. avoid implying that the data is guaranteed current or officially republished by IND

## Practical Risk Assessment

Based on the current public proclaimer, this looks reasonably safe to publish with attribution.

However:

- this is not legal advice
- the upstream website terms may change later
- if you want the lowest possible redistribution risk, you can keep the update script and fetch process public, while making the dataset itself easier to refresh or regenerate

## Recommended Attribution Text

Suggested attribution line for the repository:

> Sponsorship data is derived from the public IND recognised sponsor register. Source: Dutch Immigration and Naturalisation Service (IND), https://ind.nl/
