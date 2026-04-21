## 1. Design tokens & typography

All values below are the authoritative inferred values from `brand-proposal-final.html`. The spec delta (`specs/design-system/spec.md`) is the binding source — these snippets are drop-in starting points.

- [x] 1.1 Update `src/styles/globals.css` — add all CSS custom properties on `:root`. Use exactly these values:

  ```css
  :root {
    /* ── Color — brand ── */
    --primary: #0EA5E9;
    --primary-hover: #0284C7;
    --primary-light: #38BDF8;
    --primary-subtle: #F0F9FF;
    --accent: #F97316;
    --accent-hover: #EA580C;
    --accent-light: #FB923C;
    --accent-subtle: #FFF7ED;
    --accent-strong: #C2410C;

    /* ── Color — stone neutrals ── */
    --surface: #FFFFFF;
    --bg: #FAFAF9;
    --border: #E7E5E4;
    --border-light: #F5F5F4;
    --text: #292524;
    --text-muted: #78716C;
    --text-faint: #A8A29E;
    --stone-200: #E7E5E4;
    --stone-300: #D6D3D1;
    --stone-900: #1C1917;
    --backdrop: rgba(0, 0, 0, 0.42);

    /* ── Color — semantic ── */
    --success: #10B981;
    --success-subtle: #ECFDF5;
    --success-strong: #059669;
    --success-border: #BBF7D0;
    --warning: #F59E0B;
    --warning-subtle: #FFFBEB;
    --warning-strong: #B45309;
    --error: #EF4444;
    --error-subtle: #FEF2F2;
    --error-strong: #991B1B;
    --error-border: #FECACA;
    --error-muted-bg: #FEE2E2;

    /* ── Radius ── */
    --r-xs: 4px;
    --r-sm: 8px;
    --r: 10px;
    --r-md: 14px;
    --r-lg: 20px;
    --r-pill: 999px;

    /* ── Elevation ── */
    --e0: none;
    --e1: 0 1px 2px rgba(0, 0, 0, 0.03);
    --e2: 0 2px 6px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
    --e3: 0 6px 16px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04);
    --e4: 0 16px 40px rgba(0, 0, 0, 0.10), 0 4px 12px rgba(0, 0, 0, 0.06);
    --e-toast: 0 4px 12px rgba(0, 0, 0, 0.07);

    /* ── Motion ── */
    --d-instant: 100ms;
    --d-fast: 150ms;
    --d-base: 200ms;
    --d-med: 300ms;
    --d-slow: 400ms;
    --ease-out: cubic-bezier(0.32, 0.72, 0, 1);

    /* ── Z-index ── */
    --z-base: 0;
    --z-canvas-handle: 10;
    --z-dropdown: 100;
    --z-sticky: 200;
    --z-popover: 300;
    --z-modal-backdrop: 400;
    --z-modal: 410;
    --z-toast: 500;
    --z-tooltip: 600;
  }

  body {
    font-family: 'Sora', system-ui, -apple-system, sans-serif;
    font-feature-settings: "ss01", "cv11";
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }

  *:focus-visible {
    outline: 2px solid var(--primary-light);
    outline-offset: 2px;
    border-radius: 3px;
  }
  ```

  Framer Motion springs (in `src/lib/motion.ts` or similar): `snap = { stiffness: 340, damping: 34, mass: 0.9 }`, `gentle = { stiffness: 200, damping: 26, mass: 1 }`.

- [x] 1.2 ~~Update `tailwind.config.ts`~~ **N/A:** this project uses Tailwind v4 via `@tailwindcss/vite`; there is no config file. Tailwind utility tokens are defined in an `@theme {}` block inside `src/styles/globals.css` (done in §1.1) — `bg-primary`, `rounded-md`, `shadow-e1`, etc. compile from those.

  ```ts
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
          subtle: 'var(--primary-subtle)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
          subtle: 'var(--accent-subtle)',
          strong: 'var(--accent-strong)',
        },
        stone: { 200: 'var(--stone-200)', 300: 'var(--stone-300)', 900: 'var(--stone-900)' },
        surface: 'var(--surface)',
        bg: 'var(--bg)',
        border: { DEFAULT: 'var(--border)', light: 'var(--border-light)' },
        text: { DEFAULT: 'var(--text)', muted: 'var(--text-muted)', faint: 'var(--text-faint)' },
        success: { DEFAULT: 'var(--success)', subtle: 'var(--success-subtle)', strong: 'var(--success-strong)' },
        warning: { DEFAULT: 'var(--warning)', subtle: 'var(--warning-subtle)', strong: 'var(--warning-strong)' },
        error: { DEFAULT: 'var(--error)', subtle: 'var(--error-subtle)', strong: 'var(--error-strong)' },
      },
      borderRadius: {
        xs: 'var(--r-xs)', sm: 'var(--r-sm)', DEFAULT: 'var(--r)',
        md: 'var(--r-md)', lg: 'var(--r-lg)', pill: 'var(--r-pill)',
      },
      boxShadow: {
        e1: 'var(--e1)', e2: 'var(--e2)', e3: 'var(--e3)', e4: 'var(--e4)',
        toast: 'var(--e-toast)',
      },
      transitionDuration: {
        instant: '100ms', fast: '150ms', base: '200ms', med: '300ms', slow: '400ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      zIndex: {
        'canvas-handle': '10', dropdown: '100', sticky: '200',
        popover: '300', 'modal-backdrop': '400', modal: '410',
        toast: '500', tooltip: '600',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  }
  ```

- [x] 1.3 Swap Inter → Sora: remove any existing Inter `<link>`/font-face declarations; add `<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet">` with matching `preconnect` links for `fonts.googleapis.com` and `fonts.gstatic.com` in the root layout / `__root.tsx`. (Also removed `@fontsource-variable/inter` dep from package.json — run `npm install` to sync node_modules.)
- [x] 1.4 Remove hardcoded legacy values across `src/**`:
  - Colors: `#EA4C89`, `#C4307A`, `#FDF2F8`, `#F8F9FC`, `#E5E7EB` (old border) — replace with tokens.
  - Typeface: any `Inter` reference — replace with the Tailwind `font-sans` class or the CSS variable.
  - Verify no literal `200ms`/`300ms` durations, no literal `box-shadow: 0 1px 2px...` strings outside `globals.css`/`tailwind.config.ts`.

## 2. Components

Base recipe (apply to all Raised variants): `height: 38px; padding: 0 16px; border-radius: var(--r); font: 600 14px/1 'Sora'; letter-spacing: -0.005em; transition: transform var(--d-instant) var(--ease-out), box-shadow var(--d-base); &:active { transform: translateY(1px); }`.

- [x] 2.1 Update button component to Raised style. Create 5 variants with these exact shadow stacks:
  - **Primary** (`b-p`): `background: linear-gradient(180deg, #38BDF8 0%, #0EA5E9 100%); color: white; box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 0 #0369A1, 0 2px 4px rgba(14,165,233,0.3);` → hover replaces outer `2px 4px` with `4px 12px` at 0.4 alpha.
  - **Secondary** (`b-s`): `background: linear-gradient(180deg, #FFFFFF 0%, #FAFAF9 100%); color: var(--text); box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 var(--border), 0 2px 4px rgba(0,0,0,0.05), inset 0 0 0 1px var(--border);` → hover swaps inset ring to `#D6D3D1`, outer to `3px 8px / 0.08`.
  - **Accent** (`b-a`): gradient `#FB923C → #F97316`; hover-color `#C2410C`; shadow colors `rgba(249,115,22,0.3/0.4)`.
  - **Destructive** (`b-d`): gradient `#FEF2F2 → #FEE2E2`; color `var(--error)`; `inset 0 0 0 1px #FECACA`; hover swaps inset to `#FCA5A5` with `rgba(239,68,68,0.2)` outer.
  - **Ghost** (`b-g`): `background: transparent; color: var(--text-muted); box-shadow: none;` → hover `background: var(--border-light); color: var(--text);`.
  - Disabled: `opacity: 0.5; cursor: not-allowed;` — suppress hover/active transitions.
- [x] 2.2 Add form-control components matching brand doc:
  - `<Checkbox>`: 18×18, 1.5px `--border`, 6px radius; checked fill `--primary`, white check SVG; focus-visible adds `0 0 0 3px var(--primary-subtle)` ring.
  - `<Radio>`: 18×18 circle; checked border `--primary` + 8px `--primary` dot.
  - `<Toggle>`: 36×20 track, 16px thumb, `--r-pill`; off track `--stone-300`, on track `--primary`; thumb `translateX(16px)` via `--d-fast` `--ease-out`.
  - `<Select>`: same dims as `<input>`, `appearance: none`; right-side lucide `ChevronDown` at 16px, 10px right padding.
  - `<Textarea>`: `min-height: 80px`, `line-height: 1.5`, `resize: vertical`, 10px/12px padding.
  - `<Input>`: `height: 38px; padding: 0 12px; border: 1.5px solid var(--border); border-radius: var(--r); font: 400 14px 'Sora'; background: white; transition: border-color var(--d-fast), box-shadow var(--d-fast);` focus: border `--primary-light` + `box-shadow: 0 0 0 3px var(--primary-subtle)`; placeholder `--text-faint`.
- [x] 2.3 Update overlay components (Modal only — Popover/Tooltip can be added when a consumer needs them):
  - `<Modal>`: `border-radius: var(--r-lg); box-shadow: var(--e4); background: white;` max-width 560px; backdrop `background: var(--backdrop);` (= `rgba(0,0,0,0.42)`); z-index backdrop 400 / modal 410; entrance via Framer `snap` spring on scale+opacity; exit `--d-base` fade.
  - `<Popover>`: `border-radius: var(--r-lg); box-shadow: var(--e3); border: 1px solid var(--border);` entrance `--d-fast` fade + 4px translate-y; z-index 300.
  - `<Tooltip>`: `background: var(--stone-900); color: white; font: 500 12px 'Sora'; padding: 6px 10px; border-radius: 6px;` 500ms open delay, 0ms close delay, optional 8px arrow, z-index 600.
- [x] 2.4 Add loading components:
  - `<Spinner>`: 20px SVG, 2.5px stroke, track `--primary-subtle`, arc `--primary`, 0.7s linear rotation; 12px variant for inline use.
  - `<Skeleton>`: `background: linear-gradient(90deg, var(--border-light) 0%, var(--bg) 50%, var(--border-light) 100%); background-size: 200% 100%; animation: shim 1.4s linear infinite;` where `@keyframes shim { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }`; radius matches replaced content.
  - `<ProgressBar>`: `height: 4px; background: var(--stone-200); border-radius: var(--r-pill);` fill `background: var(--primary); transition: width var(--d-base);`.
- [x] 2.5 Add `<EmptyState>` component: centered column, 48px lucide icon in `--stone-300` (stroke-width 1.5), 18/700 title, 14/400 muted subtitle (max-width 320px), primary Raised CTA. Used on first-run dashboard, filter-no-results, archived-facet list.
- [x] 2.6 Update badges and cards:
  - `<Badge>`: `--r-pill`, 10/700/uppercase/0.05em, 3px/10px padding. Variant classes map to token pairs: `success` → `--success-subtle` + `--success-strong`; `warning` → `--warning-subtle` + `--warning-strong`; `error` → `--error-subtle` + `--error-strong`; `accent` → `--accent-subtle` + `--accent-strong`; `primary` → `--primary-subtle` + `--primary`.
  - `<Card>`: `background: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r-lg); padding: 18px; box-shadow: var(--e1); transition: all var(--d-base) var(--ease-out);` hover: `box-shadow: var(--e3); transform: translateY(-1px); border-color: var(--stone-300);`.
- [x] 2.7 Add `<Toast>` component (themed Sonner Toaster in `__root.tsx`): `background: white; border: 1px solid var(--border); border-radius: var(--r-md); box-shadow: var(--e-toast); padding: 11px 14px; font: 500 13px 'Sora';` with a 3×18px 2px-radius left-edge bar tinted by semantic status (`--success` / `--warning` / `--error`); stack vertically with 10px gap; z-index 500. Wire through existing `sonner` theme if already installed.

## 3. Default facet theme

- [x] 3.1 ~~Update `app/lib/themes.ts`~~ Created `src/lib/themes.ts` (project uses `src/lib/`, not `app/lib/`) with the 7 THEMES entries.
- [x] 3.2 Migration file written at `supabase/migrations/20260420000000_rebrand_default_color_scheme.sql` containing both the DEFAULT change and the backfill. **Not yet executed** — user must run `supabase db push` (or equivalent) to apply.
- [x] 3.3 Backfill included in the same migration file (see §3.2).

## 4. Tone / copy sweep

- [x] 4.1 Audit toasts, error messages, empty states, and CTAs. Tightened auth error strings in login/signup/reset-password/forgot-password routes.
- [x] 4.2 No "Oops!", "We're sorry", "Something went wrong" — all removed from `src/**`; grep-verified.

## 5. New surfaces (can ship later)

- [x] 5.1 Logo wordmark applied in sidebar (`src/components/layout/sidebar.tsx`) and `form-unavailable.tsx`: lowercase `parlay.`, Sora 800, `--primary` with `--accent` period.
- [x] 5.2 Transactional email templates at `src/lib/email/templates.ts` — hand-rolled HTML (no `react-email` dep added) matching the desaturated shell spec (primary CTA only, no accent orange, system-font fallback). `src/lib/auth/server.ts` now calls `verificationEmail` / `resetPasswordEmail` via Resend.
- [x] 5.3 OG image at `public/og.svg` — 1200×630, sky-blue gradient, `parlay.` wordmark with `#FED7AA` period, tagline, right-side dot-grid fading left. **Note:** served as SVG; most platforms accept SVG OG, but for maximum compatibility a PNG export is recommended (use e.g. `sharp` or an online converter to generate `public/og.png` and reference that in `<meta property="og:image">`).

## 6. Spec deltas (this change)

- [x] 6.1 `specs/design-system/spec.md` — MODIFIED `Brand color palette` (now includes `--stone-200`/`--stone-300`), `Component conventions` (now includes toast structure), `App sidebar navigation`, `Scope of default styling`; ADDED `Typography scale`, `Design tokens` (now includes 4px-grid spacing), `Form controls`, `Overlays`, `Focus rings`, `Loading and empty states`, `Table conventions`, `Tone of voice`, `Logo and wordmark`, `Transactional email templates`, `Reduced motion`, `Iconography`, `Color scheme mode (light only)`, `Social and OG image`.
- [x] 6.2 `specs/landing-page/spec.md` — MODIFIED `Hero section` (brand token references).
- [x] 6.3 `specs/form-unavailable/spec.md` — MODIFIED `Visual design` (brand token references).
- [x] 6.4 `specs/dashboard/spec.md` — MODIFIED `Form card grid` (pink → primary sky-blue).
- [x] 6.5 `specs/builder-color-scheme/spec.md` — MODIFIED `Pre-defined themes` (Default primary/accent).
- [x] 6.6 `specs/facets/spec.md` — MODIFIED `Facet schema` (color_scheme DEFAULT).

## 7. Validation

- [x] 7.1 `openspec validate design-system-rebrand --type change --strict` — valid.
- [x] 7.2 `npm run lint` — 0 errors, 0 warnings after implementation.
- [x] 7.3 `npx tsc --noEmit` — 0 errors.
- [ ] 7.4 `npm run test:e2e` — **deferred:** e2e suite not run in this session; worth running before merge if CI doesn't cover it.
- [ ] 7.5 Visual check: dashboard + form-card verified live; builder / settings / auth / form-unavailable visually reviewed via token-discipline sweep but not end-to-end clicked through. **Recommend a final walk-through.**

## 8. Archive

- [x] 8.1 Run `openspec archive design-system-rebrand` after merge to update canonical specs.
- [x] 8.2 Manually updated `openspec/specs/landing-page/spec.md` Purpose block: "pink brand identity" → "sky-blue + orange brand identity".
- [ ] 8.3 Cross-change cleanup — the in-flight `builder-canvas-drag-refinements` change defines `Selected edge styling` with stroke `#EA4C89` (pink). After BOTH changes archive, update the canonical `openspec/specs/builder-canvas/spec.md` `Selected edge styling` requirement: swap `#EA4C89` for `--accent` (`#F97316`). Also verify `src/styles/globals.css` selected-edge rule was swapped during task §1.4.
- [ ] 8.4 Cross-change cleanup — the same in-flight change specifies the drag-preview skeleton as "indigo hairline at ~22% alpha, ~6% indigo fill". Indigo is not in the new palette. After both archive, update the canonical `Stacked child layout (Scratch-style)` requirement to use `--primary` (sky blue) at the same alpha levels, and swap the `src/styles/globals.css` skeleton wrapper rule accordingly. Sky blue matches the Page node color and reinforces the "this is where a node will go" semantic.
