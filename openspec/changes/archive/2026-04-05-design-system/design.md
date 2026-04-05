## Context

The project has Tailwind v4 configured via `@tailwindcss/vite` with a bare `@import "tailwindcss"` in `globals.css`. No design tokens, shared components, or layout structure exist. The design-system spec defines a brand palette, component conventions, sidebar navigation, and player style isolation.

## Goals / Non-Goals

**Goals:**
- Tailwind theme tokens matching the spec's brand palette (via CSS `@theme` in Tailwind v4)
- Inter typeface loaded and applied globally
- Reusable UI components: Button, Card, Input, Badge, ProgressBar, MetricCard
- AppShell layout with fixed sidebar for authenticated routes
- Mobile responsive sidebar (hamburger + slide-over at < 768px)
- Player route isolated from app-shell styling

**Non-Goals:**
- Implementing page content (dashboard cards, builder canvas, settings form)
- Building the landing page layout (separate change)
- Dark mode (not in spec)

## Decisions

### 1. Tailwind v4 @theme for brand tokens

**Decision:** Define brand colors, shadow, and border-radius in `globals.css` using Tailwind v4's `@theme` directive, which generates both CSS custom properties and Tailwind utility classes automatically.

```css
@theme {
  --color-primary: #EA4C89;
  --color-accent: #C4307A;
  --color-light: #FDF2F8;
  --color-surface: #FFFFFF;
  --color-background: #F8F9FC;
  --color-border: #E5E7EB;
  --color-text: #111827;
  --color-text-muted: #6B7280;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --radius-card: 12px;
}
```

**Why:** Tailwind v4 natively supports `@theme` — no `tailwind.config.ts` needed. Tokens are available as both `var(--color-primary)` and `bg-primary`, `text-primary`, etc.

**Alternative considered:** Separate `tailwind.config.ts` with `theme.extend.colors` — rejected because Tailwind v4's CSS-first approach is simpler and keeps all tokens in one file.

### 2. Component architecture — plain functions, not a library

**Decision:** Build components as simple React function components in `src/components/ui/`. No component library (Radix, shadcn, etc.). Use Tailwind classes directly.

**Why:** The spec defines a small, specific set of components. A library would add unnecessary abstraction. Components are just Tailwind-styled wrappers with typed props.

### 3. Sidebar state — React state, not Zustand

**Decision:** Manage mobile sidebar open/close state with local React `useState` in the AppShell component. No Zustand involvement.

**Why:** Sidebar state is local UI state, not shared across the app. Zustand is reserved for builder state as specified.

### 4. Player isolation via layout structure

**Decision:** The `_authed.tsx` layout wraps children in `<AppShell>` (which renders the sidebar). The player route (`$formId.tsx`) is NOT under `_authed/`, so it never gets the AppShell. No additional CSS scoping needed.

**Why:** TanStack Start's layout nesting already provides structural isolation. The player is a public route outside the `_authed` layout tree.

### 5. Inter font via @fontsource-variable

**Decision:** Install `@fontsource-variable/inter` and import it in `globals.css`. Set `font-family: 'Inter Variable', sans-serif` on the body.

**Why:** Self-hosted via npm avoids Google Fonts network dependency. The variable font package is ~100KB and supports all weights.

### 6. Mobile sidebar animation

**Decision:** Use Framer Motion's `AnimatePresence` + `motion.div` for the slide-over panel. Already installed as a project dependency.

**Why:** Framer Motion is already in the dependency tree for other animations. Using it for the sidebar avoids adding CSS transitions that would need manual orchestration for enter/exit.

## Risks / Trade-offs

**[Tailwind v4 @theme stability]** → `@theme` is the documented Tailwind v4 approach. Pin the Tailwind version to avoid breaking changes.

**[Inter font bundle size]** → ~100KB for the variable font. Acceptable for a SaaS app. Can subset later if needed.

**[No component library]** → More manual work for accessibility (focus management, aria attributes). Mitigated by keeping components simple and adding aria attributes where the spec requires interaction (buttons, inputs, navigation).
