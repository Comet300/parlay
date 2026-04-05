## 1. Design Tokens & Font

- [x] 1.1 Install `@fontsource-variable/inter`
- [x] 1.2 Update `src/styles/globals.css`: add `@theme` block with all brand tokens (colors, shadow, border-radius), import Inter font, set body font-family
- [x] 1.3 Import Inter font in `src/routes/__root.tsx` and verify tokens are available (e.g., `bg-primary` utility works)

## 2. UI Primitives

- [x] 2.1 Create `src/components/ui/button.tsx` — Button component with `variant` prop (primary: pink fill/white text, secondary: white bg/border) and `size` prop (sm, md, lg)
- [x] 2.2 Create `src/components/ui/card.tsx` — Card component with white bg, border, border-radius-card, shadow-card
- [x] 2.3 Create `src/components/ui/input.tsx` — Input component with white bg, 1.5px border, pink focus ring, forwarded ref
- [x] 2.4 Create `src/components/ui/badge.tsx` — Badge/chip component with pill shape, small font, `variant` prop for semantic colors (default, success, warning, danger)
- [x] 2.5 Create `src/components/ui/progress-bar.tsx` — ProgressBar component with pink fill on light gray track, `value` prop (0-100)
- [x] 2.6 Create `src/components/ui/metric-card.tsx` — MetricCard component wrapping Card with large bold number + muted label

## 3. App Shell & Sidebar

- [x] 3.1 Create `src/components/layout/sidebar.tsx` — fixed-left sidebar with Parlay logo (links to /dashboard), Dashboard nav item (LayoutDashboard icon), Settings nav item (Settings icon), active route highlighting with pink left border
- [x] 3.2 Create `src/components/layout/app-shell.tsx` — AppShell wrapping sidebar + main content area with `bg-background` and proper padding
- [x] 3.3 Add mobile sidebar: at < 768px, collapse sidebar to hamburger icon; on tap, open Framer Motion slide-over panel with nav items; close on backdrop tap or nav click
- [x] 3.4 Wire AppShell into `src/routes/_authed.tsx` layout so all authenticated pages get the sidebar

## 4. Verification

- [x] 4.1 Verify `npm run build` succeeds with all new components
- [x] 4.2 Verify `npm run dev` renders the sidebar on /dashboard and /settings with correct brand colors, Inter font, and active state highlighting
- [x] 4.3 Verify the player route (`/$formId`) does NOT render the sidebar or app-shell styles
