## Why

The auth layer is in place but there's no way to create or manage forms yet. Forms and facets are the core domain entities — every other feature (builder, player, submissions, export) depends on them existing. This change stands up the full forms + facets data layer and CRUD operations so the rest of the product can build on top.

## What Changes

- Create the Supabase migration with `forms`, `facets`, `facet_nickname_history`, and supporting triggers/functions/RLS policies
- Implement server functions for form CRUD (create with default facet, update title, delete with CASCADE)
- Implement server functions for facet CRUD (create/duplicate, rename with history, delete with auto-promote, status transitions, set default)
- Implement facet nickname validation and history tracking for 3xx redirect support
- Build the dashboard page with form card grid, search, filtering, sorting, pagination, and action menus
- Build the builder facet switcher dropdown (list facets, create, rename, set default)
- Implement auto-save for flow_definition and color_scheme with debounce and unsaved indicator

## Capabilities

### New Capabilities

_None — all capabilities are covered by existing specs._

### Modified Capabilities

_None — this change implements existing spec requirements without modifying them._

## Impact

- **Database**: New migration adding `forms`, `facets`, `facet_nickname_history` tables, triggers (`update_facet_updated_at`, `update_form_updated_at`), RLS policies, and partial unique indexes
- **Server functions**: New authenticated server functions for form/facet CRUD operations using bridged JWT for Supabase RLS
- **Routes**: New `/dashboard` route, updates to `/build/$facetId` route for facet switcher and auto-save
- **Dependencies**: Supabase client (already configured), Zustand stores for builder state
