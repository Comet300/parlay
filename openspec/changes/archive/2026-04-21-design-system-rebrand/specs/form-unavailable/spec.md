## MODIFIED Requirements

### Requirement: Visual design
The system SHALL render a polished, animated full-viewport page using Parlay's default brand tokens from `design-system` (`--primary` = `#0EA5E9`, `--bg` = `#FAFAF9`, wordmark in Sora 800 with `--accent` period). The page SHALL NOT use the facet's custom `color_scheme`.

The animation SHALL be visually distinctive and interesting — for example: an animated flow graph where the nodes gradually disconnect, fade, and dissolve to convey the form is no longer active. Node styling on this page SHALL match the builder canvas's node styling from `builder-nodes` so the page reads as "a flow at rest."

The page SHALL use:
- Background: `--bg`.
- Primary accent (links, any CTA): `--primary`.
- Text: `--text` (body), `--text-muted` (secondary).
- Typeface: Sora (see `design-system` › `Typography scale`).

The system is free to invent the specific animation as long as it is high-quality and thematically appropriate.

#### Scenario: Brand tokens applied
- **GIVEN** a respondent visits an archived facet URL
- **WHEN** the form-unavailable page renders
- **THEN** the page background SHALL be `#FAFAF9` (`--bg`)
- **AND** any CTA or accent element SHALL use `--primary` (`#0EA5E9`)
- **AND** no element SHALL use the legacy `#EA4C89` color
- **AND** no element SHALL use the facet's own `color_scheme`
