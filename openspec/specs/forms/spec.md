# forms Specification

## Purpose
Manage the top-level Form entity — the conceptual research instrument
that groups one or more Facets.

## Requirements

### Requirement: Form schema
The system SHALL persist forms with the following Postgres schema:
- id: uuid pk default gen_random_uuid()
- user_id: uuid not null fk -> public."user"(id)
- title: text not null
- round_robin_enabled: boolean not null default false
- round_robin_counter: integer not null default 0
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

RLS: owner read/write/delete via user_id, using the authenticated user's JWT.

### Requirement: Form creation
The system SHALL create a Form and its first Facet atomically when the
user clicks "New Form" on the dashboard.
The first Facet SHALL have nickname "default", is_default = true,
status = 'draft', color_scheme set to the Default theme values, and
flow_definition containing pre-placed Start and End semantic nodes.
The system SHALL redirect to /build/:newFacetId immediately after creation.

### Requirement: Form title editing
The system SHALL allow the form title to be edited inline in the builder
toolbar. Changes SHALL debounce-save to Supabase on blur (the save triggers
after the field loses focus, debounced to avoid rapid duplicate saves).

### Requirement: updated_at maintenance
The system SHALL update forms.updated_at to now() on every UPDATE to
the forms row (title change, round_robin_enabled toggle, etc.).
Additionally, any update to a child facet (flow_definition save,
color_scheme save, status change, nickname rename) SHALL propagate an
updated_at = now() update to the parent forms row.
This SHALL be implemented as a Postgres trigger on the facets table:

```sql
CREATE OR REPLACE FUNCTION update_form_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE forms SET updated_at = now() WHERE id = NEW.form_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_facet_update_form
  AFTER UPDATE ON facets
  FOR EACH ROW EXECUTE FUNCTION update_form_updated_at();
```

### Requirement: Ownership validation
The system SHALL enforce ownership via Supabase RLS policies using the
authenticated user's JWT. The forms.user_id field is the ownership anchor.
RLS policies on forms SHALL restrict SELECT, UPDATE, and DELETE to rows
where user_id matches the authenticated user's auth.uid().

### Requirement: Form deletion
The system SHALL allow the form owner to delete a form from the dashboard.
Deleting a form SHALL CASCADE to all related data: facets, submissions,
responses, round_robin_log entries, and facet_nickname_history rows.
The system SHALL show a confirmation dialog before deletion.

#### Scenario: New Form creation
- GIVEN a user is on the dashboard
- WHEN they click "New Form"
- THEN the system creates a forms row with title "Untitled Form"
- AND atomically creates a facets row with nickname "default",
  is_default = true, status = 'draft', and Start + End nodes in flow_definition
- AND redirects to /build/{newFacetId}

#### Scenario: Title update
- GIVEN the user is in the builder
- WHEN they edit the form title inline and blur the field
- THEN the system debounce-saves the new title to forms.title in Supabase

#### Scenario: Form deletion
- GIVEN a form has 3 facets with submissions
- WHEN the owner selects "Delete form" and confirms
- THEN the form and all facets, submissions, responses, and related data are deleted
- AND the form disappears from the dashboard
