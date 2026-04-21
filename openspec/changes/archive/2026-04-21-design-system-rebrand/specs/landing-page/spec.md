## MODIFIED Requirements

### Requirement: Hero section
The system SHALL render a full-viewport hero section with:

- A bold headline and subheadline (invented copy for a research interview flow builder SaaS — e.g. "Build smarter research flows." / "Design, publish, and analyze interview flows without writing a line of code.")
- An animated canvas-based node-graph background: gently drifting nodes connected by edges, echoing the builder aesthetic. No WebGL libraries. Implemented with HTML5 Canvas or pure CSS/SVG animation.
- Primary CTA button "Start building" → `/signup` (Raised primary button — `--primary` gradient, see `design-system` › `Component conventions`).
- Secondary CTA button "See how it works" → smooth-scroll to the demo section (Raised secondary button).
- Framer Motion fade-in-up animation on initial load, using the `snap` spring from `design-system` › `Design tokens`.
- The entire section SHALL use Parlay brand tokens from `design-system` (`--primary`, `--accent`, `--bg`, `--text`). No hardcoded brand hex literals.

#### Scenario: Hero uses brand tokens
- **GIVEN** the landing page `/` loads
- **WHEN** the hero section renders
- **THEN** the primary CTA background SHALL be a `linear-gradient` using `--primary-light` and `--primary`
- **AND** no element in the hero SHALL use the legacy `#EA4C89` color
- **AND** the typeface SHALL resolve to Sora
