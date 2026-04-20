## MODIFIED Requirements

### Requirement: Form card grid
The system SHALL render one card per form in a responsive grid layout. Each card SHALL display:

- Static thumbnail image from `public/thumbnail-placeholder.svg`.
- Form title (clickable, navigates to `/build/{defaultFacetId}`).
- Form status badge next to the title:
  - "Active" (`--primary-subtle` bg + `--primary` text) if any facet is active.
  - "Draft" (muted gray — `--border-light` bg + `--text-muted` text) if all facets are draft.
  - "Archived" (dimmed — `--bg` + `--text-faint`) if all facets are archived.
- Facet chips (one per facet, only when > 1 facet) colored by status:
  - draft → muted gray
  - active → `--primary-subtle` bg + `--primary` text
  - archived → dimmed
  Chips display nickname and `(default)` label when `round_robin_enabled = false`. Each chip SHALL include a kebab menu with per-facet actions: Edit (navigate to builder), View Live (disabled unless active), Export CSV (disabled), Publish (draft only), Unpublish (active only), Re-activate (archived only), and Delete facet (with confirmation). Archiving is only available at the form level, not per-facet.
- Default facet selector dropdown (when `round_robin_enabled = false` AND > 1 facet).
- Round-robin toggle (when the form has > 1 facet).

Card styling SHALL follow `design-system` › `Component conventions`: white surface, 1.5px `--border`, `--r-lg` corners, `--e1` at rest, `--e3` on hover with 1px lift.

#### Scenario: Active facet chip uses primary token
- **GIVEN** a form with one active facet
- **WHEN** the card renders
- **THEN** the "Active" badge SHALL have background `--primary-subtle`
- **AND** its label SHALL render in `--primary`
- **AND** no element SHALL use the legacy `#EA4C89` color
