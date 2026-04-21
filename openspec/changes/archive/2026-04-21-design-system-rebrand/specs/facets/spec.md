## MODIFIED Requirements

### Requirement: Facet schema
The system SHALL persist facets with the following Postgres schema:

- `id`: `uuid pk default gen_random_uuid()`
- `form_id`: `uuid not null fk -> forms ON DELETE CASCADE`
- `nickname`: `text not null` — unique within form via `UNIQUE (form_id, nickname)`; pattern `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, max 60 chars
- `is_default`: `boolean not null default false`
- `status`: `enum('draft','active','archived') not null default 'draft'`
- `color_scheme`: `jsonb not null default '{"primary":"#0EA5E9","accent":"#F97316","background":"#FFFFFF","theme":"default"}'`
- `flow_definition`: `jsonb not null` — initial value contains pre-placed Start and End semantic nodes positioned for a left-to-right canvas layout
- `created_at`: `timestamptz default now()`
- `updated_at`: `timestamptz default now()`

RLS: owner full read/write/delete via `form_id -> forms.user_id`; public `SELECT` on `status = 'active'` rows only.

The `color_scheme` DEFAULT value SHALL mirror the app brand tokens from `design-system` › `Brand color palette` so new facets inherit the current brand. A non-breaking migration SHALL update the DEFAULT clause and optionally backfill rows where `color_scheme->>'theme' = 'default'` to align their primary/accent with the new brand.

#### Scenario: New facet inherits brand-aligned defaults
- **GIVEN** the migration has been applied
- **WHEN** a new facet is inserted without specifying `color_scheme`
- **THEN** the row's `color_scheme` SHALL equal `{"primary":"#0EA5E9","accent":"#F97316","background":"#FFFFFF","theme":"default"}`

#### Scenario: Migration backfills default-theme facets
- **GIVEN** a facet persisted before this change with `color_scheme = {"primary":"#EA4C89","accent":"#C4307A","background":"#FFFFFF","theme":"default"}`
- **WHEN** the backfill migration runs
- **THEN** its `color_scheme` SHALL be updated to `{"primary":"#0EA5E9","accent":"#F97316","background":"#FFFFFF","theme":"default"}`
- **AND** facets with `theme != 'default'` SHALL NOT be modified
