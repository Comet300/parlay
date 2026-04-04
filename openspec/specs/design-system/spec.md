# design-system Specification

## Purpose
Define Parlay's visual design language applied across all app surfaces
except the form player (which uses per-facet color schemes).

## Requirements

### Requirement: Brand color palette
The system SHALL use the following brand tokens as Tailwind config values
and CSS custom properties available globally:

- Primary:    #EA4C89 (Dribbble pink)
- Accent:     #C4307A (deeper pink — hover states, active elements)
- Light:      #FDF2F8 (pink tint — backgrounds, highlights)
- Surface:    #FFFFFF
- Background: #F8F9FC (app shell background)
- Sidebar:    #FFFFFF with 1px #E5E7EB right border
- Text:       #111827 (near-black)
- Text muted: #6B7280
- Border:     #E5E7EB
- Shadow:     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)

### Requirement: Component conventions
The system SHALL implement the following component conventions consistently:

- Cards: white background, 1px #E5E7EB border, 12px border-radius, shadow
- Sidebar: fixed left, white, icon + label nav items, active item = pink left border accent
- Primary button: #EA4C89 fill, white text
- Secondary button: white background with 1px #E5E7EB border
- Badges/chips: pill shape, small font, semantically colored
- Progress bars: #EA4C89 fill on light gray track
- Metric cards: large bold number, muted label below, white surface
- All inputs: white bg, 1.5px border, focus ring in #EA4C89
- Typeface: Inter throughout

### Requirement: App sidebar navigation
The system SHALL render a fixed-left sidebar on all authenticated pages
(/dashboard, /build/:facetId, /settings). The sidebar SHALL contain:
- Parlay logo at the top (clickable, navigates to /dashboard)
- Navigation items:
  - Dashboard (icon: LayoutDashboard) -> /dashboard
  - Settings (icon: Settings) -> /settings
- The active route's nav item SHALL be highlighted with a pink left border
- On mobile (< 768px), the sidebar SHALL collapse to a hamburger menu
  that opens a slide-over panel
The sidebar SHALL NOT appear on public routes (/, /login, /signup,
/forgot-password, /reset-password, or the form player).

### Requirement: Scope of default styling
The system SHALL apply the default design system to all app surfaces:
dashboard, builder, settings, landing page, and form-unavailable page.
The system SHALL NOT apply default app styling inside the form player.
The player uses per-facet CSS custom properties (--color-primary,
--color-accent, --color-background) exclusively.

#### Scenario: Player style isolation
- GIVEN a facet has color_scheme { primary: "#16a34a", accent: "#059669", background: "#fefce8" }
- WHEN a respondent opens the form player
- THEN the player root element applies those three CSS custom properties
- AND no Parlay app-shell styles (#EA4C89 etc.) bleed into the player
- AND the respondent sees the facet's own color scheme throughout

#### Scenario: App shell consistent styling
- GIVEN a user navigates between /dashboard, /build/:facetId, and /settings
- WHEN any of these pages render
- THEN all surfaces use the Parlay brand tokens
- AND the sidebar, cards, buttons, and inputs all follow the component conventions
- AND the sidebar highlights the active navigation item

#### Scenario: Mobile sidebar
- GIVEN the user is on /dashboard at 375px width
- WHEN the page renders
- THEN the sidebar is collapsed into a hamburger icon
- WHEN the user taps the hamburger
- THEN a slide-over navigation panel appears with Dashboard and Settings links
