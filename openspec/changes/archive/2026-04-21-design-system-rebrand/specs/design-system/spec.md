## MODIFIED Requirements

### Requirement: Brand color palette
The system SHALL expose the following brand tokens as Tailwind config values and as CSS custom properties available globally on `:root`. All downstream specs and components SHALL reference these tokens by name rather than inlining hex literals.

**Primary (Sky Blue):**
- `--primary` = `#0EA5E9`
- `--primary-hover` = `#0284C7`
- `--primary-light` = `#38BDF8`
- `--primary-subtle` = `#F0F9FF`

**Accent (Warm Orange):**
- `--accent` = `#F97316`
- `--accent-hover` = `#EA580C`
- `--accent-light` = `#FB923C` (gradient top for Raised accent button)
- `--accent-subtle` = `#FFF7ED`
- `--accent-strong` = `#C2410C` (saturated text on `--accent-subtle`)

**Warm Stone neutrals:**
- `--surface` = `#FFFFFF`
- `--bg` = `#FAFAF9`
- `--border` = `#E7E5E4`
- `--border-light` = `#F5F5F4`
- `--text` = `#292524`
- `--text-muted` = `#78716C`
- `--text-faint` = `#A8A29E`
- `--stone-200` = `#E7E5E4` (alias of `--border`; exposed under stone name where a neutral UI-meta surface reads better)
- `--stone-300` = `#D6D3D1` (toggle-off track, canvas dot-grid dots, progress-bar track, empty-state icon fill)
- `--stone-900` = `#1C1917` (used for tooltip/dark surfaces)
- `--backdrop` = `rgba(0,0,0,0.42)` (modal backdrop overlay)

**Semantic:**
- `--success` = `#10B981`; `--success-subtle` = `#ECFDF5`; `--success-strong` = `#059669`; `--success-border` = `#BBF7D0`
- `--warning` = `#F59E0B`; `--warning-subtle` = `#FFFBEB`; `--warning-strong` = `#B45309`
- `--error` = `#EF4444`; `--error-subtle` = `#FEF2F2`; `--error-strong` = `#991B1B`; `--error-border` = `#FECACA`; `--error-muted-bg` = `#FEE2E2` (Raised destructive button gradient bottom stop)

The `-strong` variants exist so components rendering saturated text on a `-subtle` background (badges, toast text, destructive button labels) can reference tokens rather than inlining hex values.

The sidebar right-border, app background, and default card border SHALL use `--border` on `--bg` rather than the previous `#E5E7EB` on `#F8F9FC`.

#### Scenario: Tokens available at `:root`
- **GIVEN** any authenticated page loads
- **WHEN** the DOM paints
- **THEN** `getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()` SHALL return `#0EA5E9`
- **AND** `--accent` SHALL return `#F97316`
- **AND** `--bg` SHALL return `#FAFAF9`

#### Scenario: No hardcoded legacy hex values in components
- **GIVEN** the codebase after the rebrand ships
- **WHEN** searched for the literal strings `#EA4C89`, `#C4307A`, or `#FDF2F8` outside of changelog / spec / legacy-migration files
- **THEN** no matches SHALL be returned in `src/**`

### Requirement: Component conventions
The system SHALL implement the following component conventions consistently across all app surfaces (except the form player):

- **Cards:** white surface, 1.5px `--border`, `--r-lg` (20px) corners, `--e1` shadow at rest and `--e3` on hover, `-1px` vertical lift on hover.
- **Sidebar:** fixed left, white, icon + label nav items, active item highlighted with a left border accent in `--primary` (2.5px) and background `--primary-subtle`.
- **Buttons (Raised):** `linear-gradient(180deg, …)` fill (top lighter → bottom base) from `--primary-light` → `--primary` (or variant equivalent), inset top-highlight at `rgba(255,255,255,0.3)`, layered drop-shadow (1px hover-color bottom + diffuse color shadow), 38px height, `--r` (10px) corners, 14px / 600 weight label, `translateY(1px)` on `:active`. The system SHALL expose 5 button variants:
  - **Primary** (`b-p`): `--primary-light` → `--primary` gradient, white label. Main action on a surface.
  - **Secondary** (`b-s`): `--surface` → `--bg` gradient, `--text` label, 1px inset `--border` ring. Low-emphasis action.
  - **Accent** (`b-a`): `--accent-light` → `--accent` gradient, white label. Attention-grabbing action such as "New Form".
  - **Destructive** (`b-d`): `--error-subtle` → `--error-muted-bg` gradient, `--error` label, 1px inset `--error-border` ring. Destructive actions such as delete.
  - **Ghost** (`b-g`): transparent background, `--text-muted` label, no shadow. Hover: `--border-light` background. Used for tertiary/nav-style buttons where a raised treatment would be too loud.
  `disabled` buttons SHALL render at `opacity: 0.5` with `cursor: not-allowed` and SHALL NOT transition on hover or press.
- **Inputs:** 38px height, white bg, 1.5px `--border`, `--r` (10px) corners, 14px / 400 body. Focus state: `--primary-light` border + 3px `--primary-subtle` box-shadow ring.
- **Badges/chips:** `--r-pill` (999px), 10px / 700 / 0.05em tracking, uppercase. Semantic colors map to `-subtle` background + `-strong` text: `--success-subtle` + `--success-strong`, `--warning-subtle` + `--warning-strong`, `--error-subtle` + `--error-strong`, `--accent-subtle` + `--accent-strong`, `--primary-subtle` + `--primary`.
- **Progress bars:** 4px height, `--primary` fill on stone-200 track, `--r-pill`.
- **Metric cards:** large bold number in 32/800, muted label below in 12/500.
- **Toasts:** white surface, 1px `--border`, `--r-md` (14px) corners, `--e-toast` shadow, 11px / 14px padding. Each toast SHALL include a 3px-wide coloured bar on its left edge (width 3px, height 18px, 2px radius) tinted by the toast's semantic status: `--success` (success), `--warning` (warning), `--error` (error). Body text 13 / 500 in `--text`. Toasts stack vertically with 10px gap.
- **Typeface:** Sora (see `Typography scale`) for all app-shell surfaces. Inter SHALL NOT be used.

#### Scenario: Raised primary button structure
- **GIVEN** a primary button rendered in the app shell
- **WHEN** inspected in the DOM
- **THEN** its `background` SHALL be a `linear-gradient(180deg, ...)` from `#38BDF8` to `#0EA5E9`
- **AND** its `box-shadow` SHALL include an inset top-highlight and a layered drop-shadow
- **AND** clicking it SHALL apply `transform: translateY(1px)` while the pointer is down

#### Scenario: Card elevation transitions on hover
- **GIVEN** a form card on the dashboard
- **WHEN** the user hovers over it
- **THEN** its `box-shadow` SHALL transition from `--e1` to `--e3`
- **AND** its `transform` SHALL lift by 1px

### Requirement: App sidebar navigation
The system SHALL render a fixed-left sidebar on all authenticated pages (`/dashboard`, `/build/:facetId`, `/settings`). The sidebar SHALL contain:

- The Parlay wordmark at the top (lowercase `parlay.`, Sora 800, `--primary` with `--accent` period), clickable to navigate to `/dashboard`.
- Navigation items:
  - Dashboard (icon: `LayoutDashboard`) → `/dashboard`
  - Settings (icon: `Settings`) → `/settings`

The active route's nav item SHALL be highlighted with:
- a 2.5px `--primary` left-border accent, and
- a `--primary-subtle` background, and
- `--primary` text colour at weight 600.

On mobile (< 768px) the sidebar SHALL collapse to a hamburger icon that opens a slide-over panel. The sidebar SHALL NOT appear on public routes (`/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`) or the form player.

#### Scenario: Active nav item styling
- **GIVEN** the user is on `/dashboard`
- **WHEN** the sidebar renders
- **THEN** the Dashboard nav item SHALL show a 2.5px left border in `--primary`
- **AND** its background SHALL be `--primary-subtle`
- **AND** its label SHALL render in `--primary` at font-weight 600

#### Scenario: Mobile sidebar collapse
- **GIVEN** the user is on `/dashboard` at 375px width
- **WHEN** the page renders
- **THEN** the sidebar is collapsed into a hamburger icon
- **WHEN** the user taps the hamburger
- **THEN** a slide-over navigation panel appears with Dashboard and Settings links

### Requirement: Scope of default styling
The system SHALL apply the default brand tokens to all app surfaces: dashboard, builder, settings, landing page, auth pages, and form-unavailable. The system SHALL NOT apply app-shell tokens inside the form player. The player uses per-facet CSS custom properties (`--color-primary`, `--color-accent`, `--color-background`) exclusively.

#### Scenario: Player style isolation
- **GIVEN** a facet has `color_scheme { primary: "#16a34a", accent: "#059669", background: "#fefce8" }`
- **WHEN** a respondent opens the form player
- **THEN** the player root element applies those three CSS custom properties
- **AND** no Parlay app-shell tokens (`--primary`, `--accent`, `--bg`) bleed into the player
- **AND** the respondent sees the facet's own color scheme throughout

#### Scenario: App shell consistent styling
- **GIVEN** a user navigates between `/dashboard`, `/build/:facetId`, and `/settings`
- **WHEN** any of these pages render
- **THEN** all surfaces use the brand tokens defined in `Brand color palette`
- **AND** the sidebar, cards, buttons, and inputs follow the conventions in `Component conventions`
- **AND** the sidebar highlights the active navigation item as described above

## ADDED Requirements

### Requirement: Typography scale
The system SHALL use **Sora** (Google Fonts) as the single typeface across all app-shell surfaces, loaded at weights 400 / 500 / 600 / 700 / 800. The system SHALL expose the following type scale and apply it consistently:

- **Display** — 32px / 800 / −0.032em tracking (dashboard page titles, empty-state headers)
- **Title** — 22px / 700 / −0.022em tracking (popup titles, settings section headers)
- **Subtitle** — 15px / 700 / −0.01em tracking (card titles, section sub-headers)
- **Body** — 14px / 400 (default body copy)
- **Small** — 12px / 500 (metadata, card descriptions, helper text)
- **Micro** — 10px / 600 / 0.06em tracking / uppercase (labels, badges, table headers)

`font-feature-settings: "ss01", "cv11"` SHALL be applied on `body` to enable Sora's stylistic set 1 and character variant 11. Tabular numerals (`font-variant-numeric: tabular-nums`) SHALL be applied to hex codes, spacing labels, and any numeric-aligned column.

#### Scenario: Sora loaded with required weights
- **GIVEN** any app-shell page loads
- **WHEN** inspected
- **THEN** a `<link>` to `https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800` SHALL be present in `<head>`
- **AND** `getComputedStyle(document.body).fontFamily` SHALL contain `"Sora"` as the first family

### Requirement: Design tokens
The system SHALL define the following named token scales and SHALL NOT use magic numbers in components for these dimensions:

**Radius (`--r-*`):**
- `--r-xs` = 4px
- `--r-sm` = 8px
- `--r` = 10px (buttons, inputs)
- `--r-md` = 14px (canvas nodes, tables)
- `--r-lg` = 20px (cards, modals)
- `--r-pill` = 999px (badges, progress bars)

**Elevation (`--e*`):**
- `--e0` = `none` (flat)
- `--e1` = `0 1px 2px rgba(0,0,0,0.03)` — cards at rest
- `--e2` = `0 2px 6px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)` — canvas nodes, raised buttons
- `--e3` = `0 6px 16px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)` — popovers, dropdowns, card-on-hover
- `--e4` = `0 16px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)` — modals
- `--e-toast` = `0 4px 12px rgba(0,0,0,0.07)`

**Motion:**
- `--d-instant` = 100ms (tap feedback, press animations)
- `--d-fast` = 150ms (hover, micro-interactions)
- `--d-base` = 200ms (state changes)
- `--d-med` = 300ms (panels, drawers)
- `--d-slow` = 400ms (page transitions)
- `--ease-out` = `cubic-bezier(0.32, 0.72, 0, 1)` (Apple-style ease-out)
- Framer Motion springs: **snap** `{ stiffness: 340, damping: 34, mass: 0.9 }`, **gentle** `{ stiffness: 200, damping: 26, mass: 1 }`

**Z-index:**
- base `0`, canvas-handle `10`, dropdown `100`, sticky `200`, popover `300`, modal-backdrop `400`, modal `410`, toast `500`, tooltip `600`.

**Spacing (4px grid):**
- The system SHALL use a 4px-based spacing scale for all padding, margin, and gap values: `4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80`.
- Arbitrary pixel values (e.g., 5px, 13px, 27px) SHALL NOT be used for layout spacing.
- The scale SHALL be exposed via Tailwind's default `spacing` scale (which already aligns to the 4px grid at steps `1 = 4px`, `2 = 8px`, `3 = 12px`, …).
- **Scope:** the 4px-grid rule applies to layout dimensions only (padding, margin, gap, width/height when sizing containers). It does NOT apply to font sizes (which follow the type scale: 10 / 12 / 14 / 15 / 22 / 32), border widths (1 / 1.5 / 2 / 2.5), radius values (see `--r-*`), or icon sizes (12–48, per `Iconography`). These dimensions follow their own named scales.

#### Scenario: Components reference tokens, not literals
- **GIVEN** the implementation after this change ships
- **WHEN** searched for literal durations like `200ms`, `300ms`, literal shadow strings, or literal z-index integers inside `src/**` (excluding `globals.css` and `tailwind.config.ts`)
- **THEN** no matches SHALL be returned outside of comments, tests, or generated files
- **AND** components SHALL use `var(--d-*)`, `var(--e*)`, or Tailwind classes that compile to those tokens

### Requirement: Form controls
The system SHALL implement the following form-control components with consistent appearance and focus behavior:

- **Checkbox:** 18×18px square, 1.5px `--border`, `--r-sm` (8px — documented as 6px box-radius in components, reuses `--r-sm` token scaled), white bg. Checked state: `--primary` fill with white check SVG. Focus: 3px `--primary-subtle` box-shadow ring on the box.
- **Radio:** 18×18px circle, 1.5px `--border`, white bg. Checked state: `--primary` border + centered 8px `--primary` dot.
- **Toggle:** 36×20px track, 16px thumb, `--r-pill`, 2px inset padding. Off: `--stone-300` track. On: `--primary` track. Thumb slides `translateX(16px)` via `--ease-out` over `--d-fast`.
- **Select:** same dimensions and focus behavior as `<input>`. Right-side lucide `ChevronDown` icon 16px, native `<select>` styling suppressed via `appearance: none`.
- **Textarea:** same styling as `<input>` at its widest, `min-height: 80px`, `resize: vertical`, 10px vertical padding, 1.5 line-height.

All form controls SHALL receive the global `*:focus-visible` outline in addition to any component-specific focus treatment.

#### Scenario: Checkbox toggles checked state and styling
- **GIVEN** an unchecked checkbox
- **WHEN** the user clicks it
- **THEN** its background SHALL fill with `--primary`
- **AND** a white check icon SHALL render inside
- **AND** its border SHALL match `--primary`

#### Scenario: Toggle thumb animates on change
- **GIVEN** an off toggle
- **WHEN** the user clicks it
- **THEN** the track background SHALL transition to `--primary`
- **AND** the thumb SHALL translate 16px to the right
- **AND** the transition SHALL use `--d-fast` and `--ease-out`

### Requirement: Overlays
The system SHALL implement three overlay types with distinct elevation and entrance behavior:

- **Modal:** centered, max-width 560px, `--r-lg` corners, `--e4` shadow, backdrop uses `--backdrop`. Entrance: spring (`snap`) on scale + opacity; exit: fade `--d-base`. Z-index: backdrop 400 / modal 410. Dismissable via Esc, backdrop click, or explicit close button.
- **Popover** (used by node config, etc.): `--r-lg`, `--e3` shadow, 1px `--border`. Entrance: `--d-fast` fade + 4px vertical translate. Z-index 300.
- **Tooltip:** `--stone-900` background, white text, 12px / 500, 6px corner radius, 6px padding. 500ms open delay, no close delay. Optional 8px arrow pointing at the anchor. Z-index 600.

#### Scenario: Modal blocks background interaction
- **GIVEN** a modal is open
- **WHEN** the user attempts to click elements behind the backdrop
- **THEN** those clicks SHALL NOT register on the underlying page
- **AND** the backdrop SHALL have background `rgba(0,0,0,0.42)`

#### Scenario: Tooltip open delay
- **GIVEN** a tooltip-anchored element
- **WHEN** the user hovers over the anchor
- **THEN** the tooltip SHALL NOT appear immediately
- **AND** SHALL appear after 500ms of continuous hover
- **WHEN** the pointer leaves the anchor
- **THEN** the tooltip SHALL hide immediately (no close delay)

### Requirement: Focus rings
The system SHALL apply a universal `*:focus-visible` outline in `globals.css`:

```css
*:focus-visible {
  outline: 2px solid var(--primary-light);
  outline-offset: 2px;
  border-radius: 3px;
}
```

This rule covers buttons, links, checkboxes, canvas handles, and any other focusable element. Inputs SHALL additionally render their component-level focus ring (3px `--primary-subtle` box-shadow) alongside the outline — the two are complementary. No component SHALL opt out of the outline except when replacing it with a visually equivalent ring of its own.

#### Scenario: Keyboard navigation shows outline
- **GIVEN** the user Tabs through focusable elements on the dashboard
- **WHEN** focus lands on a button, link, or input
- **THEN** a 2px `--primary-light` outline SHALL render 2px outside the element
- **WHEN** the user clicks an element with the mouse
- **THEN** the outline SHALL NOT render (pointer focus is suppressed by `:focus-visible`)

### Requirement: Loading and empty states
The system SHALL provide the following state components and SHALL use them consistently:

- **Spinner:** 20×20px SVG, 2.5px stroke, `--primary-subtle` track + `--primary` spinning arc, 0.7s linear rotation. 12px variant for inline use next to "Publishing…" style labels.
- **Skeleton:** `linear-gradient(90deg, var(--border-light), var(--bg), var(--border-light))` with 200% background size, 1.4s linear shimmer animation. Corner radius SHALL match the content it replaces.
- **Progress bar:** 4px tall, `--primary` fill on `--stone-200` track, `--r-pill`. Width transitions on `--d-base`.
- **Empty state:** centered column containing a 48px lucide icon in `--stone-300`, 18/700 title in `--text`, 14/400 muted subtitle (max-width 320px), and a primary Raised button CTA. Used on first-run dashboard, filter-no-results, and archived-facet list.

#### Scenario: Spinner visible during save
- **GIVEN** the user clicks "Publish" on a facet
- **WHEN** the publish request is in flight
- **THEN** the button label SHALL change to "Publishing…"
- **AND** a 12px spinner SHALL appear before the label
- **AND** the spinner SHALL rotate at 0.7s per turn

#### Scenario: Empty dashboard renders pattern
- **GIVEN** the user is on `/dashboard` and has zero forms
- **WHEN** the page renders
- **THEN** a centered empty state appears with a `FileText` (or similar) 48px icon in `--stone-300`
- **AND** a title "No forms yet"
- **AND** a primary CTA "+ New Form"

### Requirement: Table conventions
The system SHALL render data tables (response viewer, future admin tables) with:

- Container: 1px `--border`, `--r-md` corners, white surface, overflow hidden.
- `<thead>`: `--bg` background, 10/700 / uppercase / 0.08em tracking / `--text-faint` text, 10px vertical / 14px horizontal padding, 1px `--border` bottom divider. Sortable columns SHALL include a trailing lucide `ChevronsUpDown` icon at 12px.
- `<tbody>` rows: 12px vertical / 14px horizontal padding, 1px `--border-light` bottom divider, transition `background --d-fast`. Hover: `rgba(240,249,255,0.4)` (primary-subtle at 40%).
- Numeric columns SHALL use `font-variant-numeric: tabular-nums` and right-aligned headers.

#### Scenario: Table hover highlights row
- **GIVEN** a response table with 4 rows
- **WHEN** the user hovers over row 2
- **THEN** its background SHALL transition to `rgba(240,249,255,0.4)` over `--d-fast`
- **AND** no other row SHALL change background

### Requirement: Tone of voice
The system SHALL follow these microcopy rules for all user-facing strings (toasts, error messages, empty states, button labels, form labels):

- **Warm and direct.** Active voice, second person. No apologies ("We're sorry…"), no cute interjections ("Oops!", "Yay!").
- **Errors name the thing.** Prefer "Content nodes must be inside a Page." over "Validation failed: invalid node placement."
- **CTAs are verbs.** "Publish", "Duplicate", "New Form", "Delete" — not "Submit Changes", "Make a Copy", "Create New Form".
- **Microcopy ≤ 7 words where possible.** Longer explanations belong in body text, not in button labels or toast titles.
- **No brand name inside the app.** Do not say "Parlay can't do that" — say "Can't do that here."

#### Scenario: Error microcopy is specific
- **GIVEN** a validation failure when the user attempts to save a flow with a Content node outside any Page
- **WHEN** the error toast renders
- **THEN** its text SHALL be "Content nodes must be inside a Page."
- **AND** it SHALL NOT say "Oops! Something went wrong." or "Validation error occurred."

### Requirement: Logo and wordmark
The system SHALL use a text-only wordmark as the Parlay brand mark:

- Text: lowercase `parlay.`
- Typeface: Sora, weight 800
- Letter-spacing: `-0.04em`
- The word `parlay` renders in `--primary`; the trailing period renders in `--accent`.

The wordmark SHALL be used in the app sidebar header, email headers, and the OG/social image. No separate logomark or icon-only version SHALL exist; favicon and app-icon assets SHALL render the wordmark (or a cropped "p." variant for small sizes).

#### Scenario: Wordmark renders in sidebar
- **GIVEN** the user is on any authenticated app page
- **WHEN** the sidebar renders
- **THEN** the top of the sidebar SHALL show the text "parlay." in Sora 800
- **AND** "parlay" SHALL be rendered in `--primary`
- **AND** the trailing "." SHALL be rendered in `--accent`

### Requirement: Transactional email templates
The system SHALL send transactional emails (verification, password reset, notification) built with `react-email`:

- Header: `parlay.` wordmark on white, 1px `--border-light` bottom divider, 20/24 padding.
- Body: white surface, 14/400 body text in `--text`, 28/24 padding, 14px paragraph spacing.
- Primary CTA: `--primary` fill, white label, `--r` corners, 11/22 padding, 600 weight, inline-block.
- Footer: `--bg` surface, 11px text in `--text-faint`, centered, short (≤ 2 lines).
- Email designs SHALL NOT use `--accent` (orange reserved for in-app CTAs). One primary-colored CTA per email.
- Email designs SHALL degrade gracefully without web fonts (fall back to system sans).

#### Scenario: Verification email structure
- **GIVEN** a user signs up and triggers a verification email
- **WHEN** the email renders in an HTML client
- **THEN** its header SHALL contain `parlay.` in `--primary` and `--accent` period
- **AND** its body SHALL contain a "Verify email" CTA with `--primary` background
- **AND** no `--accent` (orange) backgrounds SHALL appear in the body

### Requirement: Reduced motion
The system SHALL honor the `prefers-reduced-motion: reduce` media query across all app-shell surfaces, not just the landing page. When the media query matches:

- Framer Motion springs and tweens SHALL either be disabled outright or reduced to an instant transition (duration ≤ 10ms).
- CSS `transition` and `animation` durations longer than `--d-instant` SHALL be reduced to 0ms or `--d-instant`.
- Looping animations (spinner rotation, skeleton shimmer) MAY continue but at a reduced speed or replaced with a static placeholder — the content SHALL remain perceivable.
- Button press feedback (`translateY(1px)` on `:active`) MAY remain; it is an immediate state, not a transition.

Page content, focus rings, and interactive behavior SHALL remain fully functional regardless of the media-query value.

#### Scenario: Reduced motion disables drag preview spring
- **GIVEN** the user has `prefers-reduced-motion: reduce` set at the OS level
- **WHEN** they open the Add Node panel on the builder
- **THEN** the panel SHALL appear without the `snap` spring (instant or ≤ 10ms fade-in)
- **AND** the trigger button's enter/exit spring SHALL be replaced with an instant state change

#### Scenario: Reduced motion keeps content perceivable
- **GIVEN** the user has `prefers-reduced-motion: reduce` set
- **WHEN** a toast fires or a modal opens
- **THEN** the toast / modal SHALL still render
- **AND** SHALL appear without a slide-in or spring
- **AND** SHALL remain dismissable in the usual ways

### Requirement: Iconography
The system SHALL use **lucide-react** as the sole icon library across all app-shell surfaces. Emoji SHALL NOT be used as UI iconography (they are acceptable in user-generated content such as form titles). Icon conventions:

- **Inline text icons:** 12–16px, `strokeWidth: 2` (lucide default), color `currentColor`.
- **Nav icons:** 16px in the sidebar, 18–20px in page headers.
- **Empty-state icons:** 48px, `strokeWidth: 1.5` (lighter so large icons don't look heavy), color `--stone-300`.
- **Canvas node icons:** 12–14px, color inherits from the node header text color.
- **Button leading icons:** 14–16px with 6px gap from label.

Icons SHALL NOT be rotated, recolored with brand-incompatible hues, or stroked at widths outside `1.5–2.5`. Custom SVGs MAY be used only when lucide does not provide an equivalent (e.g., product-specific glyphs) and SHALL follow the same stroke-width / size conventions.

#### Scenario: Sidebar uses lucide icons
- **GIVEN** the app sidebar renders on `/dashboard`
- **WHEN** inspected
- **THEN** nav-item icons SHALL be rendered from `lucide-react` (e.g., `LayoutDashboard`, `Settings`)
- **AND** their default `strokeWidth` SHALL be `2`
- **AND** their color SHALL inherit from the nav item's text color

#### Scenario: Empty state icon uses muted fill
- **GIVEN** the empty-state pattern renders (e.g., "No forms yet")
- **WHEN** inspected
- **THEN** the icon SHALL be 48px
- **AND** its stroke color SHALL be `--stone-300`
- **AND** its `strokeWidth` SHALL be `1.5`

### Requirement: Color scheme mode (light only)
The app shell SHALL render in light mode only. The system SHALL NOT respect the user's `prefers-color-scheme: dark` media query for authenticated app pages (`/dashboard`, `/build/:facetId`, `/settings`), the landing page, the auth pages, or the form-unavailable page. The form player SHALL continue to honor per-facet `color_scheme` values (including facets configured with dark backgrounds) via its own `--color-primary / --color-accent / --color-background` tokens — player isolation is unchanged.

A future dark-mode variant MAY be added post-launch; it is explicitly out of scope for this design system.

#### Scenario: App shell ignores system dark preference
- **GIVEN** the user has `prefers-color-scheme: dark` set at the OS level
- **WHEN** the user navigates to `/dashboard`
- **THEN** the app shell SHALL render with `--bg` = `#FAFAF9` (light surface)
- **AND** `--text` SHALL resolve to `#292524` (near-black on light)
- **AND** the sidebar SHALL render on white, not on a dark surface

#### Scenario: Player still supports dark facets
- **GIVEN** a facet with `color_scheme.background = '#0f172a'` (dark)
- **WHEN** a respondent opens the form player
- **THEN** the player root element applies that dark background
- **AND** the app-shell "light only" rule does NOT override the facet's color scheme

### Requirement: Social and OG image
The system SHALL serve a 1200×630 Open Graph image at a stable URL (e.g., `/og.png`) for all public pages (landing, signup, login). The image SHALL contain:

- Background: `linear-gradient(145deg, #0369A1 0%, #0EA5E9 50%, #38BDF8 100%)`.
- Overlay: faint dot grid (1.2px dots at 28px spacing, rgba(255,255,255,0.18)) with a horizontal mask so it fades from visible on the right to invisible on the left.
- Foreground: `parlay.` wordmark in Sora 800 / 54px / white (period in `#FED7AA` — a lighter orange than `--accent`, chosen for legibility against the sky-blue gradient), positioned in the lower-left quadrant.
- Tagline below the wordmark: "Visual research flow builder" in 19/400 white at 0.8 opacity.

#### Scenario: OG image served on landing page
- **GIVEN** the landing page is shared on a social platform
- **WHEN** the platform fetches the OG image
- **THEN** the image returned SHALL be 1200×630 px
- **AND** its dominant color SHALL be sky blue (`#0EA5E9` or a gradient including it)
- **AND** the `parlay.` wordmark SHALL be visible in the lower-left area
