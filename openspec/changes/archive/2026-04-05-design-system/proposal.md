## Why

The scaffolded project has Tailwind configured but no design tokens, shared components, or layout structure. Every feature change (auth pages, dashboard, builder, settings) will need the brand palette, component conventions, sidebar navigation, and Inter typeface. Implementing the design system first prevents duplicate styling work and ensures visual consistency from the start.

## What Changes

- Configure Tailwind CSS theme with Parlay brand tokens (colors, shadows, border-radius) via `src/styles/globals.css` CSS custom properties and Tailwind `@theme`
- Add the Inter typeface via `@fontsource-variable/inter`
- Create the authenticated app shell layout with fixed sidebar (logo, Dashboard link, Settings link, active state highlighting)
- Implement mobile sidebar as a hamburger-triggered slide-over panel (< 768px)
- Build shared UI primitives: Button (primary/secondary), Card, Input, Badge, ProgressBar, MetricCard
- Ensure the form player (`/$formId`) is isolated from app-shell styles — it uses per-facet CSS custom properties exclusively

## Capabilities

### New Capabilities
_None — this change implements the existing `design-system` spec. No new spec files needed._

### Modified Capabilities
_None — the design-system spec requirements are unchanged._

## Impact

- **New files**: `src/components/ui/` (Button, Card, Input, Badge, ProgressBar, MetricCard), `src/components/layout/Sidebar.tsx`, `src/components/layout/AppShell.tsx`
- **Modified files**: `src/styles/globals.css` (design tokens), `src/routes/_authed.tsx` (wrap with AppShell), `src/routes/__root.tsx` (Inter font)
- **Dependencies**: `@fontsource-variable/inter`
- **No API or database changes**
