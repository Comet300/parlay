# facets Specification

## Purpose
Manage Facets — concrete, independently editable versions of a Form,
each with its own flow definition, color scheme, and lifecycle status.

## Requirements

### Requirement: Facet schema
The system SHALL persist facets with the following Postgres schema:
- id: uuid pk default gen_random_uuid()
- form_id: uuid not null fk -> forms ON DELETE CASCADE
- nickname: text not null — unique within form via UNIQUE (form_id, nickname);
  pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/, max 60 chars
- is_default: boolean not null default false
- status: enum('draft','active','archived') not null default 'draft'
- color_scheme: jsonb not null default '{"primary":"#EA4C89","accent":"#C4307A","background":"#FFFFFF","theme":"default"}'
- flow_definition: jsonb not null — initial value contains pre-placed Start
  and End semantic nodes positioned for a left-to-right canvas layout
- created_at: timestamptz default now()
- updated_at: timestamptz default now()

RLS: owner full read/write/delete via form_id -> forms.user_id;
public SELECT on status = 'active' rows only.

### Requirement: Default facet constraint
The system SHALL enforce at most one default facet per form using a partial
unique index: CREATE UNIQUE INDEX ON facets (form_id) WHERE is_default = true.
The first facet created for a form SHALL always have is_default = true
and nickname = "default".

### Requirement: Changing the default facet
The system SHALL update is_default atomically using a transaction:
  BEGIN;
  UPDATE facets SET is_default = false WHERE form_id = $1;
  UPDATE facets SET is_default = true WHERE id = $2;
  COMMIT;

### Requirement: Status transitions
The system SHALL allow the following transitions:
- draft -> active (publish action)
- active -> draft (unpublish action)
- active -> archived (archive action)
- archived -> active (re-activate action)
The system SHALL NOT support direct draft -> archived.

### Requirement: Facet duplication
When creating a new facet from an existing one, the system SHALL deep-copy
the source facet's flow_definition and color_scheme into the new row.
The new facet SHALL be fully independent — edits SHALL NOT affect the source.

### Requirement: Facet deletion
The system SHALL allow deleting a facet from the dashboard action menu.
Deleting a facet SHALL CASCADE to related submissions, responses,
and facet_nickname_history rows.
If the deleted facet was is_default = true and other facets remain,
the system SHALL auto-promote the oldest remaining facet (by created_at,
then id) to is_default = true.
If the deleted facet was the last facet on the form, the system SHALL
delete the entire form (a form cannot exist without at least one facet).

### Requirement: Storage cleanup on facet deletion
Database CASCADE does not affect Supabase Storage files. Before deleting
a facet row, the facet deletion server function SHALL use the Supabase
**service role key** (which bypasses storage policies) to:
1. Delete all files in `markdown-uploads/{facetId}/` (uploaded images/files)
These deletions SHALL happen before the database DELETE so that Storage
files are cleaned up even if the CASCADE succeeds. If a Storage deletion
fails, the facet deletion SHALL proceed anyway (orphaned files are
acceptable; the database row is the source of truth).

### Requirement: updated_at maintenance
The system SHALL update facets.updated_at to now() on every UPDATE to
the facets row. This SHALL be implemented as a Postgres trigger:

```sql
CREATE OR REPLACE FUNCTION update_facet_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_facet_updated_at
  BEFORE UPDATE ON facets
  FOR EACH ROW EXECUTE FUNCTION update_facet_updated_at();
```

This also triggers the form-level updated_at propagation (see forms spec).

### Requirement: flow_definition structure
The flow_definition jsonb field SHALL store the serialized React Flow state
using the structure returned by `reactFlowInstance.toObject()`:

```typescript
interface FlowDefinition {
  nodes: FlowNode[];   // React Flow Node[] with custom data per node type
                       // IMPORTANT: parent nodes must appear before their
                       // children in this array (React Flow requirement).
                       // reactFlowInstance.toObject() maintains this order
                       // automatically. Any server-side manipulation of
                       // flow_definition must preserve this invariant.
  edges: FlowEdge[];   // React Flow Edge[] defining directed connections
  viewport: {          // Canvas viewport state for restore
    x: number;
    y: number;
    zoom: number;
  };
}
```

Each node in the nodes array follows the React Flow Node interface
extended with Parlay-specific data fields defined in the builder-nodes spec:
- node.type: the NodeTypeName (e.g., "page", "likert", "real_llm")
- node.data: the node-type-specific data object (label, slug, condition, etc.)
- node.parentId: the parent container node ID (for content-tier nodes)
- node.extent: 'parent' (for content-tier nodes — constrains dragging
  within the container boundary)
- node.position: { x, y } canvas coordinates (relative to parent for
  child nodes, absolute for root nodes)

The initial flow_definition for a new facet SHALL contain a Start node
positioned at { x: 0, y: 200 } and an End node positioned at { x: 600, y: 200 }
with a default viewport of { x: 0, y: 0, zoom: 1 }.

### Requirement: Auto-save
The system SHALL debounce-save flow_definition AND color_scheme to Supabase
2 seconds after any canvas, node, or color scheme change.
The system SHALL show an unsaved indicator that clears on successful save.

### Requirement: Concurrent editing (last write wins)
If the same facet is open in multiple browser tabs, each tab auto-saves
independently. The system uses a last-write-wins strategy — no optimistic
locking or conflict detection. The most recent save overwrites prior state.

#### Scenario: Publishing a facet
- GIVEN a user clicks Publish in the builder toolbar
- WHEN the server sets facets.status = 'active'
- THEN the builder displays the public URL with a copy button

#### Scenario: Re-activating an archived facet
- GIVEN a facet has status = 'archived'
- WHEN the owner sets it back to 'active' from the dashboard
- THEN the system updates facets.status = 'active'
- AND the facet becomes publicly accessible again via /:formId?v={nickname}
- AND previous visitors who already submitted this facet will see
  the End screen (once-per-visitor enforcement)

#### Scenario: Auto-save after node edit
- GIVEN the user modifies a node label in the builder
- WHEN 2 seconds pass without further changes
- THEN the system saves flow_definition to Supabase
- AND clears the unsaved indicator dot in the toolbar

#### Scenario: Auto-save after color scheme change
- GIVEN the user changes the primary color in the Form Settings panel
- WHEN 2 seconds pass without further changes
- THEN the system saves color_scheme to Supabase on the same debounce

#### Scenario: Delete facet with auto-promote
- GIVEN a form has facets "default" (is_default=true) and "variant-a"
- WHEN the owner deletes "default"
- THEN "variant-a" is auto-promoted to is_default = true
