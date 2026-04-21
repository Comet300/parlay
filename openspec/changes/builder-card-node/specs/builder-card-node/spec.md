## MODIFIED Requirements

### Requirement: Canvas representation
Card is a content-tier node and SHALL render in the same compact stacked
row layout as other content-tier nodes (see builder-canvas spec: Stacked
child layout). The card canvas node SHALL display:

- A colored type icon badge (CreditCard icon) using `--accent-subtle`
  background and `--accent` foreground as defined in `design-system` ›
  `Brand color palette`.
- The card label in Sora 500, truncated to a single line.
- A subtitle in Sora 400 at `--text-muted` reading "Card · N btn(s)"
  where N is the button count.
- A right-aligned column of **button label chips**, one per button.
  Each chip SHALL:
  - act as the button's source React Flow handle (`id = "button-{btn.id}"`),
    so clicking the chip begins a connect-drag;
  - render the button's label as visible text, truncated to a single line
    with ellipsis at a max chip width (~88px), with the full label still
    available via a `title` tooltip for overflow cases;
  - use a connected-state style (background `--primary-subtle`, text
    `--primary`) by default and a dead-path style (background
    `--error-subtle`, text `--error`, small `AlertCircle` glyph
    prefix) when the corresponding button has no outgoing edge;
  - expose a target area ≥14px × 14px for touch connect-drag.
- The resting surface SHALL use `--r-md` radius and elevation `--e1`;
  the selected surface SHALL switch to a 1px `--primary` border plus a
  `--primary` focus ring (no raised-shadow on selection; elevation is
  reserved for hover).

The chip column replaces the previous dot-handle pattern — button labels
are now legible on the canvas without requiring hover.

#### Scenario: Card with connected and dead-path buttons on the canvas
- **GIVEN** a Card node with three buttons: `Yes`, `No`, `Maybe`
- **AND** `Yes` and `No` have outgoing edges; `Maybe` does not
- **WHEN** the canvas renders the node
- **THEN** three label chips appear on the right edge, in button order
- **AND** the `Yes` chip and `No` chip use `--primary-subtle` background
  with `--primary` text
- **AND** the `Maybe` chip uses `--error-subtle` background with
  `--error` text and a leading `AlertCircle` glyph
- **AND** each chip acts as its button's source handle when the user
  begins a connect-drag

#### Scenario: Chip label truncates but preserves full label on tooltip
- **GIVEN** a Card button labeled `I would like to proceed to section two`
- **WHEN** the canvas renders the chip
- **THEN** the visible text SHALL be the label truncated to chip width
  with a trailing ellipsis
- **AND** the chip's `title` attribute SHALL equal the full label
  `I would like to proceed to section two`

### Requirement: Side panel editor
The card node config popup SHALL include:

- A Milkdown Crepe editor for `markdownContent` (with image/file upload
  support), placed inside an `EditorField` using the rebrand's standard
  input-field wrapper (`1.5px` border, `--r`, focus ring
  `--primary-subtle`).
- A button list manager with:
  - A Raised "+ Add button" control using the secondary Raised button
    style (`.b-s`) from `design-system` › `Component conventions`.
  - A destructive remove control per button using the destructive
    Raised button style (`.b-d`) — not a plain `X` glyph.
  - **Working drag-to-reorder per button**, implemented with the same
    `dnd-kit` primitives (`SortableContext` + `verticalListSortingStrategy`
    + `arrayMove`) used by the single-choice and multi-choice editors.
    The `GripVertical` icon is the drag handle and SHALL be functional,
    not decorative.
  - A label text input per button using the rebrand's `.inp` form-control
    style.
- Dead-path indicator per button row using `AlertCircle` at `--error`
  with a `title` tooltip reading "No outgoing edge".

#### Scenario: Reordering buttons via drag updates the canvas chip order
- **GIVEN** a Card node with buttons `[A, B, C]` in that order
- **WHEN** the user drags button `C`'s `GripVertical` handle above
  button `A` in the editor
- **THEN** the node's `buttons` array SHALL be reordered to `[C, A, B]`
- **AND** the canvas chip column SHALL reflect the new order on the
  next render
- **AND** existing outgoing edges SHALL continue to target the same
  `button-{id}` source handles (no edge relocation)

#### Scenario: Remove control uses destructive styling
- **WHEN** the editor renders the remove control for a button row
- **THEN** the control SHALL use the `.b-d` destructive Raised button
  recipe (red gradient, inset red border)
- **AND** it SHALL be disabled when the card has only one button
  remaining (a Card MUST have at least one button)
