## MODIFIED Requirements

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
