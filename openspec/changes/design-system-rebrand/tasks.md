## 1. Design tokens & typography

- [ ] 1.1 Update `tailwind.config.ts` — brand colors (primary/accent/stone palette), radius scale, motion durations, easing.
- [ ] 1.2 Update `src/styles/globals.css` — CSS custom properties for all tokens (palette, `--r-*`, `--e0`…`--e4`, `--d-*`, `--ease-out`, z-index scale). Global `*:focus-visible` outline rule.
- [ ] 1.3 Swap Inter → Sora: remove Inter font-face/link; add Google Fonts `<link>` for Sora weights 400/500/600/700/800 in the root layout; update `font-family` base to `'Sora', system-ui, -apple-system, sans-serif`.
- [ ] 1.4 Remove any hardcoded `#EA4C89` / `#C4307A` / `#FDF2F8` / `#F8F9FC` / `Inter` references across `src/**`; replace with tokens.

## 2. Components

- [ ] 2.1 Update button component to Raised style (gradient + inset highlight + layered shadow + `translateY(1px)` on `:active`). All variants: primary, secondary, accent, destructive, ghost.
- [ ] 2.2 Add form-control components matching brand doc: `<Checkbox>`, `<Radio>`, `<Toggle>`, `<Select>`, `<Textarea>`.
- [ ] 2.3 Update overlay components: `<Modal>` (e4, backdrop `rgba(0,0,0,0.42)`, spring entrance), `<Popover>` (e3), `<Tooltip>` (stone-900 bg, 500ms open delay).
- [ ] 2.4 Add loading components: `<Spinner>` (20px, 2.5px stroke, `--primary`), `<Skeleton>` (shimmer gradient), `<ProgressBar>` (4px, `--r-pill`).
- [ ] 2.5 Add `<EmptyState>` component (48px stone-300 icon, title, subtitle, CTA).
- [ ] 2.6 Update badges and cards to use elevation tokens (`--e1` at rest, `--e3` on hover).

## 3. Default facet theme

- [ ] 3.1 Update `app/lib/themes.ts` — `default` THEME entry to `{ primary: '#0EA5E9', accent: '#F97316', background: '#FFFFFF' }`. Leave the six other presets unchanged.
- [ ] 3.2 Supabase migration: `ALTER TABLE facets ALTER COLUMN color_scheme SET DEFAULT '{"primary":"#0EA5E9","accent":"#F97316","background":"#FFFFFF","theme":"default"}'::jsonb;`
- [ ] 3.3 Backfill: `UPDATE facets SET color_scheme = jsonb_set(jsonb_set(color_scheme, '{primary}', '"#0EA5E9"'), '{accent}', '"#F97316"') WHERE color_scheme->>'theme' = 'default';`

## 4. Tone / copy sweep

- [ ] 4.1 Audit toasts, error messages, empty states, and CTAs across the app for verb-first, ≤ 7-word microcopy. Update any offenders in `src/**` copy strings.
- [ ] 4.2 No "Oops!", "We're sorry", "Something went wrong" — replace with specific, actionable messages.

## 5. New surfaces (can ship later)

- [ ] 5.1 Logo wordmark: lowercase `parlay.` in Sora 800, primary blue with accent-orange period. Used in sidebar (already in place) and email header.
- [ ] 5.2 Transactional email: Resend + `react-email` setup. Components: `<EmailLogo>`, `<EmailButton>`, `<EmailFooter>`. Desaturated shell — primary CTA only.
- [ ] 5.3 OG/social image: 1200×630 template with sky-blue gradient, `parlay.` wordmark, tagline, faint right-side dot-grid overlay.

## 6. Spec deltas (this change)

- [x] 6.1 `specs/design-system/spec.md` — MODIFIED `Brand color palette` (now includes `--stone-200`/`--stone-300`), `Component conventions` (now includes toast structure), `App sidebar navigation`, `Scope of default styling`; ADDED `Typography scale`, `Design tokens` (now includes 4px-grid spacing), `Form controls`, `Overlays`, `Focus rings`, `Loading and empty states`, `Table conventions`, `Tone of voice`, `Logo and wordmark`, `Transactional email templates`, `Reduced motion`, `Iconography`, `Color scheme mode (light only)`, `Social and OG image`.
- [x] 6.2 `specs/landing-page/spec.md` — MODIFIED `Hero section` (brand token references).
- [x] 6.3 `specs/form-unavailable/spec.md` — MODIFIED `Visual design` (brand token references).
- [x] 6.4 `specs/dashboard/spec.md` — MODIFIED `Form card grid` (pink → primary sky-blue).
- [x] 6.5 `specs/builder-color-scheme/spec.md` — MODIFIED `Pre-defined themes` (Default primary/accent).
- [x] 6.6 `specs/facets/spec.md` — MODIFIED `Facet schema` (color_scheme DEFAULT).

## 7. Validation

- [ ] 7.1 `openspec validate design-system-rebrand --type change --strict` — valid.
- [ ] 7.2 `npm run lint` — 0 errors, 0 warnings after implementation.
- [ ] 7.3 `npx tsc --noEmit` — 0 errors.
- [ ] 7.4 `npm run test:e2e` — all passing.
- [ ] 7.5 Visual check: all 6 app surfaces (dashboard, builder, settings, landing, form-unavailable, auth) render with new tokens; player remains isolated.

## 8. Archive

- [ ] 8.1 Run `openspec archive design-system-rebrand` after merge to update canonical specs.
- [ ] 8.2 Manually update `openspec/specs/landing-page/spec.md` — rewrite the `## Purpose` block (not a Requirement, so not covered by the delta): replace "Parlay's pink brand identity" with "Parlay's sky-blue + orange brand identity". One-line edit post-archive.
- [ ] 8.3 Cross-change cleanup — the in-flight `builder-canvas-drag-refinements` change defines `Selected edge styling` with stroke `#EA4C89` (pink). After BOTH changes archive, update the canonical `openspec/specs/builder-canvas/spec.md` `Selected edge styling` requirement: swap `#EA4C89` for `--accent` (`#F97316`). Also verify `src/styles/globals.css` selected-edge rule was swapped during task §1.4.
- [ ] 8.4 Cross-change cleanup — the same in-flight change specifies the drag-preview skeleton as "indigo hairline at ~22% alpha, ~6% indigo fill". Indigo is not in the new palette. After both archive, update the canonical `Stacked child layout (Scratch-style)` requirement to use `--primary` (sky blue) at the same alpha levels, and swap the `src/styles/globals.css` skeleton wrapper rule accordingly. Sky blue matches the Page node color and reinforces the "this is where a node will go" semantic.
