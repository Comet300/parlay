# dashboard Specification

## Purpose
Define the /dashboard page showing all of the authenticated user's forms
with pagination, search, filtering, sorting, and per-form/per-facet actions.

## Requirements

### Requirement: Form card grid
The system SHALL render one card per form in a responsive grid layout.
Each card SHALL display:
- Static thumbnail image from public/thumbnail-placeholder.svg
- Form title (clickable, navigates to /build/{defaultFacetId})
- Facet chips (one per facet) colored by status:
    draft = muted gray, active = primary pink, archived = dimmed
- Default facet selector dropdown (when round_robin_enabled = false AND >1 facet)
- Round-robin toggle (when the form has >1 facet)
- Action menu per facet chip

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
- Status filter: All, Has Active, All Draft, Has Archived
  (filters based on whether the form contains facets matching the status)
The active filter SHALL be visually indicated.

### Requirement: Sorting
The system SHALL provide a sort dropdown above the grid with options:
- Last updated (default) — by forms.updated_at DESC
- Newest first — by forms.created_at DESC
- Oldest first — by forms.created_at ASC
- Alphabetical (A-Z) — by forms.title ASC

### Requirement: Draft card styling
Draft facet chips SHALL render at reduced opacity.
Form cards where ALL facets are draft SHALL show a "Draft" watermark.

### Requirement: Action menu per facet chip
Each facet chip SHALL have an action menu with:
- Edit: navigate to /build/{facetId}
- View Live: open /:formId?v={nickname} in a new browser tab
  (disabled/grayed for archived facets)
- Export CSV: open the CSV export modal (see csv-export spec)
- Delete facet: delete this facet with confirmation (see facet deletion below)
- Archive: set facets.status = 'archived' (with confirmation prompt)

### Requirement: Facet deletion
The system SHALL allow deleting individual facets from the action menu.
On delete confirmation the system SHALL:
1. Delete the facet row (CASCADE deletes related submissions, responses,
   and facet_nickname_history rows)
2. If the deleted facet was is_default = true and other facets remain,
   auto-promote the oldest remaining facet to is_default = true
3. If the deleted facet was the last facet on the form, delete the
   entire form (a form cannot exist without at least one facet)
The system SHALL show a confirmation dialog warning that all response
data for this facet will be permanently deleted.

### Requirement: Form deletion
The system SHALL provide a "Delete form" option in a form-level action menu
(e.g., a kebab menu on the form card header).
On confirmation the system SHALL delete the form row. CASCADE SHALL delete
all facets, submissions, responses, round_robin_log entries, and
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

#### Scenario: Archive confirmation
- GIVEN a facet chip action menu is open
- WHEN the user selects "Archive"
- THEN the system shows a confirmation prompt
- WHEN the user confirms
- THEN facets.status is set to 'archived'
- AND the facet chip updates to archived styling

#### Scenario: Delete facet (not last)
- GIVEN a form has 3 facets and the user opens the action menu on facet "variant-b"
- WHEN they select "Delete facet" and confirm
- THEN the facet row and all its data are deleted
- AND the form card updates to show 2 remaining facets

#### Scenario: Delete last facet cascades to form
- GIVEN a form has 1 remaining facet
- WHEN the user deletes that facet and confirms
- THEN the facet and the entire form are deleted
- AND the form card disappears from the dashboard

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
