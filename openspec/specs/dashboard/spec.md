# dashboard Specification

## Purpose
Define the /dashboard page showing all of the authenticated user's forms
with pagination, search, filtering, sorting, and per-form/per-facet actions.

## Requirements

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

### Requirement: Pagination
The system SHALL paginate the form card grid with a configurable page size
(default 12 forms per page). The system SHALL show pagination controls
(previous, next, page numbers) below the grid.

### Requirement: Search
The system SHALL show a search input above the grid that filters forms
by title (case-insensitive partial match). Search SHALL debounce at 300ms
and update the grid without a full page reload.

### Requirement: Filtering
The system SHALL provide filter controls above the grid:
- Status filter: All, Active, Draft, Archived
  (filters based on whether the form contains facets matching the status)
The active filter SHALL be visually indicated.

### Requirement: Sorting
The system SHALL provide a sort dropdown above the grid with options:
- Newest first (default) — by forms.created_at DESC
- Oldest first — by forms.created_at ASC
- Last updated — by forms.updated_at DESC
- Alphabetical (A-Z) — by forms.title ASC

### Requirement: Draft card styling
Draft facet chips SHALL render at reduced opacity.

### Requirement: Form-level action menu
The system SHALL provide a kebab menu on each form card header with:
- Archive form: set all non-archived facets to status = 'archived'
  (with confirmation dialog warning that all URLs will stop working).
  Hidden when all facets are already archived.
- Delete form: delete the form row. CASCADE SHALL delete all facets,
  submissions, responses, round_robin_log entries, and
  facet_nickname_history rows.
  The system SHALL show a confirmation dialog warning that all data for
  this form and all its facets will be permanently deleted.

### Requirement: Round-robin toggle on card
The round-robin toggle SHALL be visible on a form card when the form has
more than one facet.
Toggling OFF SHALL show an inline prompt requiring the user to select
the default facet before the toggle is committed.
The toggle state SHALL update forms.round_robin_enabled in Supabase.

### Requirement: Default facet selector on card
When round_robin_enabled = false and the form has more than one facet,
the system SHALL show a dropdown for selecting the default facet.
Changing the selection SHALL execute the two-step SQL transaction to
update facets.is_default.

### Requirement: New Form button
The dashboard SHALL have a prominent "New Form" button.
Clicking it SHALL trigger a server action that:
1. Creates a forms row with a default title (e.g. "Untitled Form")
2. Creates a first facets row with nickname "default", is_default = true,
   status = 'draft', color_scheme set to the Default theme values, and
   flow_definition containing pre-placed Start and End semantic nodes
3. Redirects to /build/{newFacetId}

### Requirement: Empty state
When the user has no forms, the system SHALL show an empty state with
a prompt and a "Create your first form" CTA button.

#### Scenario: Thumbnail display
- GIVEN a form exists on the dashboard
- WHEN the dashboard renders
- THEN the form card shows the static public/thumbnail-placeholder.svg

#### Scenario: Archive form
- GIVEN a form card with active facets
- WHEN the user selects "Archive form" from the form menu and confirms
- THEN all non-archived facets are set to status 'archived'
- AND the form card updates to show "Archived" badge

#### Scenario: Delete form
- GIVEN a form card with 3 facets
- WHEN the user selects "Delete form" from the form menu and confirms
- THEN the form and all its facets and data are permanently deleted

#### Scenario: Search forms
- GIVEN the user has forms titled "User Research", "Onboarding Survey", "Exit Interview"
- WHEN they type "research" in the search input
- THEN only "User Research" is shown in the grid

#### Scenario: New form creation
- GIVEN a user clicks "New Form"
- WHEN the server action completes
- THEN the user is redirected to /build/{newFacetId}
- AND the builder opens with Start and End nodes on the canvas
