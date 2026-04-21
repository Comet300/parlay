# form-unavailable Specification

## Purpose
Define the page shown when a form or facet is no longer accessible due to
being archived, having no active facets, having no active default facet,
or a return visitor's assigned facet being archived.

## Requirements

### Requirement: Trigger conditions
The system SHALL render the FormUnavailable page when any of the following
conditions are met during facet resolution:
- The ?v= nickname belongs to a facet with status = 'archived'
- round_robin_enabled = true and the form has zero active facets
- round_robin_enabled = false and no active facet with is_default = true exists
- A return visitor's previously assigned facet (via round_robin_log) has
  been archived since their last visit

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

### Requirement: Message content
The page SHALL clearly inform the respondent that this form is no longer
accepting responses using friendly, non-technical language.
Example: "This form has ended. Thank you for your interest —
this interview is no longer accepting responses."
The Parlay logo and brand SHALL be visible on the page.

### Requirement: No form content leak
The system SHALL NOT display any form content, node text, facet data, or
the facet's custom color_scheme on this page.
The page renders purely in Parlay's default brand style regardless of
what the form contained.

### Requirement: HTTP status code
The system SHALL return an appropriate HTTP status:
- 410 Gone for archived facets and forms with no active facets
- 404 for unrecognized form IDs

#### Scenario: Archived facet URL
- GIVEN a facet with nickname "pilot" has status = 'archived'
- WHEN a respondent visits /:formId?v=pilot
- THEN the system returns HTTP 410
- AND renders the FormUnavailable page with Parlay brand styling
- AND shows a message indicating the form is no longer active
- AND does NOT render any form content or use the facet's color_scheme

#### Scenario: All facets archived
- GIVEN all facets of a form are archived
- AND round_robin_enabled = true
- WHEN any respondent visits /:formId (any visitor_id)
- THEN the system counts zero active facets
- AND renders the FormUnavailable page

#### Scenario: No active default facet
- GIVEN round_robin_enabled = false
- AND the form's default facet has been archived
- WHEN a respondent visits /:formId
- THEN the system finds no active is_default facet
- AND renders the FormUnavailable page

#### Scenario: Return visitor, assigned facet archived
- GIVEN visitor_id "abc123" was assigned to facet "horizon" via round-robin
- AND facet "horizon" has since been archived
- WHEN visitor "abc123" returns to /:formId
- THEN the system finds the round_robin_log entry
- AND detects the assigned facet is archived
- AND renders the FormUnavailable page
