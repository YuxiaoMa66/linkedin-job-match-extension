# Data Attribution and Reuse Notes

This project includes a local sponsor dataset derived from the Dutch Immigration and Naturalisation Service (`IND`) public recognised sponsor register.

Files involved:

- `data/ind-nl-2026-03-11.csv`
- `data/ind_sponsors.json`
- `data/update_sponsors.js`

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
