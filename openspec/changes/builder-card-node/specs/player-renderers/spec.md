## MODIFIED Requirements

### Requirement: Card renderer
The system SHALL render the full Milkdown `markdownContent` as HTML,
followed by N buttons (one per `CardButton`) stacked vertically below
the content. Each button SHALL use the Raised button recipe defined in
`design-system` › `Component conventions` (gradient fill, inset top
highlight, layered shadow, `translateY(1px)` on `:active`).

Button colors SHALL bind to the **facet's** color scheme via the
`--color-primary` / `--color-accent` / `--color-background` CSS custom
properties set on the player root (see `Color scheme application`), not
to the app's `--primary` token. This preserves player isolation — a
facet using the "Rose" preset renders rose-pink Raised buttons, a facet
using "Ember" renders ember-orange, regardless of the app shell's
sky-blue branding.

Clicking a button SHALL:

1. Record the button's `label` as the response value in the session
   (keyed by the card node's `alias`, or its internal React Flow id as
   a fallback when `alias` is empty) **if** `record_response = true` on
   the card node. Recording SHALL complete synchronously (Zustand
   in-memory) before navigation begins.
2. Route to the button's target via the graph-traversal engine
   (client-side state change, no URL update), following the edge whose
   `sourceHandle = "button-{btn.id}"`.
3. If the Card is inside a PageGroup and is on a virtual page that is
   not the last virtual page, skip all remaining virtual pages and
   navigate directly to the button's edge target (see builder-card-node
   › `Routing in the player`).

No separate Continue button SHALL be shown — the card buttons ARE the
continue mechanism.

#### Scenario: Card button click records response and routes
- **GIVEN** a Card node with `alias: "q-choice"`, `record_response: true`
- **AND** two buttons: `{ id: "yes", label: "Yes" }` and
  `{ id: "no", label: "No" }`
- **AND** an edge from `sourceHandle: "button-yes"` → PageNode `A`
- **WHEN** the respondent clicks the `Yes` button in the player
- **THEN** `session.responses["q-choice"]` SHALL equal `"Yes"`
- **AND** the player SHALL navigate to PageNode `A` without a URL change
- **AND** no Continue button SHALL be rendered

#### Scenario: Card buttons use the facet's color scheme
- **GIVEN** a facet whose `color_scheme.primary` is `#E11D48` (Rose preset)
- **WHEN** the player mounts and resolves the facet
- **THEN** the Card renderer's buttons SHALL use `var(--color-primary)`
  (i.e., `#E11D48`) for the gradient-top stop
- **AND** the app's `--primary` token (`#0EA5E9`) SHALL NOT appear
  anywhere in the rendered Card surface
