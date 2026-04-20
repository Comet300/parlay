## Why

Parlay's brand identity has been rebuilt from scratch — palette, typography, button style, tokens, and voice — and documented in `brand-proposal-final.html` at the project root. The canonical `design-system` spec (and five other specs that reference brand colors) still document the previous Dribbble-pink + Inter identity. This change brings all specs in line with the settled brand so implementation can proceed against a single source of truth.

## What Changes

### `design-system` — Core rebrand
- **MODIFIED:** `Brand color palette` — replace Dribbble pink (`#EA4C89`) + warm-gray neutrals with Sky Blue (`#0EA5E9`) primary + warm Orange (`#F97316`) accent + warm Stone neutrals (`#FAFAF9` bg, `#E7E5E4` border, `#292524` text).
- **MODIFIED:** `Component conventions` — Raised button style (gradient + inset highlight + layered shadow + 1px press), Sora typeface, updated radius/elevation conventions, **toast structure (colored left bar + `--e-toast`)**.
- **MODIFIED:** `App sidebar navigation` — active item uses sky-blue left border accent (no behavioral change).
- **MODIFIED:** `Scope of default styling` — brand token references updated to the new palette; player isolation is unchanged.
- **ADDED:** `Typography scale` — Sora, 6-step size scale with letter-spacing tokens.
- **ADDED:** `Design tokens` — radius (`--r-xs`…`--r-pill`), elevation (`--e0`…`--e4`), motion duration + easing + Framer springs, z-index scale, **4px-grid spacing scale**.
- **ADDED:** `Form controls` — checkbox, radio, toggle, select, textarea conventions.
- **ADDED:** `Overlays` — modal, popover, tooltip structure, elevation, and entrance behavior.
- **ADDED:** `Focus rings` — universal keyboard-focus treatment.
- **ADDED:** `Loading and empty states` — spinner, skeleton, progress bar, empty-state pattern.
- **ADDED:** `Table conventions` — response-viewer table structure.
- **ADDED:** `Tone of voice` — warm-and-direct voice rules and microcopy length.
- **ADDED:** `Logo and wordmark` — lowercase `parlay.` wordmark, no separate logomark.
- **ADDED:** `Color scheme mode (light only)` — app shell is light-only; `prefers-color-scheme: dark` is ignored for app surfaces. Player isolation is preserved (facets may still be dark).
- **ADDED:** `Reduced motion` — app-wide respect for `prefers-reduced-motion: reduce` (not just landing).
- **ADDED:** `Iconography` — lucide-react as sole icon library, size/stroke conventions for inline / nav / empty-state / canvas / button-leading icons.
- **ADDED:** `Transactional email templates` — Resend + react-email, desaturated shell, primary-only CTAs.
- **ADDED:** `Social and OG image` — 1200×630 template.

### `landing-page`
- **MODIFIED:** `Purpose` + `Hero section` — replace "pink brand identity" / `#EA4C89 primary` with sky-blue + orange tokens.

### `form-unavailable`
- **MODIFIED:** `Visual design` — replace `Primary: #EA4C89, app background: #F8F9FC` with the new brand tokens.

### `dashboard`
- **MODIFIED:** `Form card grid` — replace "primary pink" status badges/chips with "primary sky-blue" (tokens only; behavior unchanged).

### `builder-color-scheme`
- **MODIFIED:** `Pre-defined themes` — update the `default` THEME entry primary/accent to the new app brand (`#0EA5E9` / `#F97316`); the six secondary themes are unchanged. Existing facets on the `default` theme will pick up the new colors on next render.

### `facets`
- **MODIFIED:** `Facet schema` — update the DB default for the `color_scheme` jsonb column to `{"primary":"#0EA5E9","accent":"#F97316","background":"#FFFFFF","theme":"default"}`. Existing facet rows are unaffected by the `DEFAULT` change; an optional one-shot `UPDATE` backfills rows where `color_scheme->>'theme' = 'default'` to align with the new Default preset.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `design-system` — palette, typography, tokens, components, overlays, focus, states, voice, logo, email, social
- `landing-page` — brand token references
- `form-unavailable` — brand token references
- `dashboard` — brand token references
- `builder-color-scheme` — Default THEME primary/accent
- `facets` — DB default value for `color_scheme`

## Impact

### Files to modify (implementation, not this change)
- `tailwind.config.ts` — brand tokens
- `src/styles/globals.css` — CSS custom properties for palette, radius, elevation, motion, z-index
- All UI components referencing `#EA4C89`, Inter, or the old elevation/radius values
- `app/lib/themes.ts` — Default theme primary/accent
- New Supabase migration: `ALTER TABLE facets ALTER COLUMN color_scheme SET DEFAULT '{"primary":"#0EA5E9","accent":"#F97316","background":"#FFFFFF","theme":"default"}'::jsonb;` + optional backfill of `theme='default'` rows

### New dependencies
- `@fontsource/sora` or `<link>` to Google Fonts (Sora, weights 400/500/600/700/800)
- (optional) `react-email` + `@react-email/components` for transactional templates

### Schema changes
- Default value change only on `facets.color_scheme` (non-breaking).

### No API changes.
