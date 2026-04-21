## Context

Parlay's identity was rebuilt from first principles to answer a question the old one didn't: *what does this product feel like?* The old pink (`#EA4C89`) was borrowed from Dribbble and carried no meaning for a research-flow builder. Inter was a safe default but too neutral to give the product a voice. User feedback during iteration: "purple is overused in AI-built projects" — the rebrand had to avoid generic-AI-SaaS cues.

The settled identity is Sky Blue (`#0EA5E9`) + warm Orange (`#F97316`) + warm Stone neutrals, Sora typeface, Raised buttons (tactile/Stripe-style), and Apple-style motion. Full reference: `brand-proposal-final.html` at repo root.

## Goals

1. One source of truth for brand tokens. Specs stop documenting hex literals inline — they reference named tokens (`--primary`, `--r-md`, `--e3`) so palette swaps become one-file changes.
2. Cover the gaps the old spec left: tokens (radius/elevation/motion/z-index), form controls beyond `<input>`, overlays, focus rings, loading/empty states, tables, voice, email, social.
3. Keep player-isolation intact. Form player continues to use per-facet `--color-primary / --color-accent / --color-background` and does not inherit app-shell branding.

## Non-Goals

- Dark mode for the app shell. Explicitly skipped; revisit post-launch.
- New marketing site design. The landing-page spec receives only token-reference updates.
- Rewriting the builder canvas visual language. Node colors (Start green / Page blue / End red / Group blue-lighter) are unchanged — they're semantic, not brand.

## Key Decisions

### 1. Default facet color scheme mirrors the app brand
**Options**
- A. Keep `default` theme as pink (no DB migration needed).
- B. Update `default` theme to sky-blue + orange.

**Choice: B.** New users publishing a facet on the default theme get a coherent first impression — the player matches the app they just came from. The six non-default themes (Ocean, Ember, Forest, Midnight, Rose, Monochrome) are unchanged. Existing facets on custom themes are unaffected; existing facets on `theme='default'` will pick up the new colors on next render. Migration is non-breaking (DEFAULT clause change + optional UPDATE for `theme='default'` rows).

### 2. Raised buttons over flat or pill
**Options**
- A. Flat (current): single background color, border, hover-color change.
- B. Pill: fully rounded (999px), 1px-lift hover.
- C. Raised (Stripe-style): gradient fill + inset top-highlight + layered drop-shadow, presses down 1px on active.

**Choice: C.** The builder is a tactile tool — users drag nodes, drop into containers, wire edges. Buttons that feel physical ("click" with visual weight) reinforce the direct-manipulation feel. A and B looked generic in side-by-side previews.

### 3. Sora over Wotfard
**Options**
- A. Wotfard (Atipo Foundry) — self-hosted, license required for weights > 400.
- B. Sora (Google Fonts) — free, 8 weights, geometric humanist.

**Choice: B.** Wotfard Regular was licensed and tested, but bold weights required additional licensing and the user decided the simplicity of one-CDN-load beat the distinctiveness gain. Sora's voice (designed for UI, geometric with warm humanist terminals) lands close enough.

### 4. One font, five weights (not a pair)
**Rejected:** a display/body type pair. Builder UI is dense — mixing faces in node headers, popup config panels, and canvas tooltips would add noise. Sora carries all text from 10px microcopy to 32px display.

### 5. Tokens vs hex literals in specs
**Rule:** specs reference named tokens (`--primary`, `--r-md`, etc.) wherever possible. Only the `Brand color palette` and `Design tokens` requirements document hex values — everywhere else says "primary" or "`--primary`". This prevents drift when palette changes ship and keeps spec deltas small.

### 6. Global `*:focus-visible` outline
**Choice:** one universal rule covering buttons, links, inputs, checkboxes, canvas handles. Rationale: inconsistent focus rings are the #1 accessibility regression vector, and per-component rings require per-component review. Inputs keep their additional soft-ring box-shadow for emphasis; the outline supplements, not replaces.

## Risks / Trade-offs

- **Facets on `theme='default'` change color.** Mitigation: the migration is scoped (`WHERE color_scheme->>'theme' = 'default'`); users who picked any other preset or customized colors are unaffected. The six preset themes don't change. Considered shipping without the backfill — rejected because the visual drift between app (sky blue) and player (pink) on the Default theme is worse than a one-time color shift.
- **OG image + email templates are new surface area.** Not urgent — can ship with placeholder assets while the app ships without them. Specs document the intended end-state.
- **Tailwind config + CSS custom properties must stay in sync.** Implementation task: generate one from the other, or use a single source in `tailwind.config.ts` with `extend.colors`/`extend.borderRadius`/etc. referenced from CSS variables.

## Migration Plan (rollout)

1. Update `tailwind.config.ts` + `src/styles/globals.css` with new tokens (palette, radius, elevation, motion, z-index).
2. Swap typeface: remove Inter, add Sora (Google Fonts link in root layout, update `font-family` base).
3. Update Raised button component + all button call-sites.
4. Ship default-facet backfill migration.
5. Sweep for hardcoded `#EA4C89` / `Inter` / old elevations across `src/**` — replace with tokens.
6. Verify player-isolation still holds (no app-shell tokens bleed into `/f/:formId`).
