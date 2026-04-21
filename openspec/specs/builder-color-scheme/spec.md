# builder-color-scheme Specification

## Purpose
Define the color scheme configuration UI in the Form Settings panel of the
builder, including pre-defined themes, color pickers, and the component
gallery carousel. Form Settings is accessed via a side panel (desktop) or
slide-over menu (mobile) — see builder-canvas spec.

## Requirements

### Requirement: Color scheme data structure
Each facet's color_scheme field SHALL store:
{ primary: string, accent: string, background: string, theme: string }
where theme is a named preset key (see themes below) or "custom".

### Requirement: Pre-defined themes
The system SHALL define the following themes in `app/lib/themes.ts`:

```typescript
export const THEMES: ColorTheme[] = [
  { key: 'default',    label: 'Default',    primary: '#0EA5E9', accent: '#F97316', background: '#FFFFFF' },
  { key: 'ocean',      label: 'Ocean',      primary: '#0891b2', accent: '#0ea5e9', background: '#f0f9ff' },
  { key: 'ember',      label: 'Ember',      primary: '#ea580c', accent: '#dc2626', background: '#1c1917' },
  { key: 'forest',     label: 'Forest',     primary: '#16a34a', accent: '#059669', background: '#fefce8' },
  { key: 'midnight',   label: 'Midnight',   primary: '#7c3aed', accent: '#6366f1', background: '#0f172a' },
  { key: 'rose',       label: 'Rose',       primary: '#e11d48', accent: '#f43f5e', background: '#fff1f2' },
  { key: 'monochrome', label: 'Monochrome', primary: '#374151', accent: '#6b7280', background: '#f9fafb' },
];
```

The `default` theme's primary and accent SHALL mirror the app brand tokens defined in `design-system` › `Brand color palette`. The six non-default themes are unchanged.

#### Scenario: Default theme matches app brand
- **GIVEN** a new facet is created with the default theme
- **WHEN** `THEMES.find(t => t.key === 'default')` is read
- **THEN** `primary` SHALL equal `#0EA5E9`
- **AND** `accent` SHALL equal `#F97316`
- **AND** `background` SHALL equal `#FFFFFF`

#### Scenario: Existing default-theme facet picks up new colors
- **GIVEN** a facet persisted before this change with `color_scheme.theme = 'default'` and legacy pink primary/accent
- **WHEN** the facet is opened in the builder color-scheme picker after the backfill ships
- **THEN** its primary SHALL be `#0EA5E9` and accent SHALL be `#F97316`
- **AND** the theme picker SHALL show "Default" selected (not "Custom")

### Requirement: Theme picker dropdown
The system SHALL show a theme picker dropdown in the Form Settings panel.
Selecting a named theme SHALL populate all three color pickers with the
corresponding values and update color_scheme.theme.
"Custom" SHALL appear as a disabled/display-only option in the dropdown
when the current theme is "custom" — it cannot be selected directly.

### Requirement: Custom theme detection
When the user manually edits any of the three color pickers (primary,
accent, or background), the system SHALL automatically set theme to
"custom" in color_scheme.theme.

### Requirement: Auto-save on same debounce
Color scheme changes SHALL be auto-saved on the same 2-second debounce
as flow_definition changes. Both are written to the facets row together.

### Requirement: Component gallery carousel
The system SHALL render a horizontally scrollable carousel in the Form
Settings panel showing all renderable node types in preview={true} mode.
The carousel SHALL apply the current color_scheme values as inline CSS
custom properties (--color-primary, --color-accent, --color-background)
so previews update live as the user changes colors.
Gallery items SHALL include: Likert, Single Choice, Multi Choice,
Email Collection, Card, Scripted LLM (static chat bubbles), Real LLM
(free-text chat UI stub).

### Requirement: Round-robin sub-section
The Form Settings panel SHALL include a round-robin sub-section that is
only visible when the form has more than one facet.
This sub-section SHALL show a toggle for round_robin_enabled.
When toggled OFF with multiple active facets: an inline prompt SHALL
appear requiring the user to select the default facet before the toggle
is committed.
When toggled ON: the default facet constraint is lifted.

#### Scenario: Theme selection updates pickers
- GIVEN the Form Settings panel is open with theme "Default" selected
- WHEN the user selects "Ocean" from the theme dropdown
- THEN primary is set to #0891b2, accent to #0ea5e9, background to #f0f9ff
- AND all three color pickers update to show the new values
- AND the component gallery carousel re-renders with the new colors immediately

#### Scenario: Manual edit triggers custom
- GIVEN the user has the "Forest" theme selected
- WHEN they change the primary color picker to #FF0000
- THEN color_scheme.theme is set to "custom"
- AND the dropdown shows "Custom" as a display label
- AND accent and background retain their Forest values

#### Scenario: Gallery live preview
- GIVEN the Form Settings panel is open
- WHEN the user drags the primary color picker
- THEN every carousel item re-renders in real time showing the new color
- AND no page reload or save is required for the preview
