# landing-page Specification

## Purpose
Define the / landing page — animation-heavy, mobile-first, using Parlay's
sky-blue + orange brand identity to showcase the product and drive signups. Modern 2026
design language with fluid animations throughout.

## Requirements

### Requirement: Navigation bar
The system SHALL render a minimal sticky top navbar with:
- Parlay logo on the left
- "Sign in" and "Sign up" buttons on the right (desktop)
- Hamburger menu icon on mobile that opens a slide-in side menu with:
  Sign in, Sign up, and anchor links to page sections
The navbar SHALL use a glass-morphism/frosted-glass effect with backdrop blur.
The navbar SHALL animate in on initial load and respond to scroll
(e.g., shrink/darken on scroll-down, expand on scroll-up).

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

### Requirement: Interactive demo section
The system SHALL render a static SVG/HTML mockup of the canvas builder.
This section SHALL contain NO real React Flow code and SHALL share NO
components with the actual builder.
The mockup SHALL show 6 pre-placed nodes:
  Start -> [Page containing Likert] -> [Page containing Card] ->
  [ScriptedLLM] -> End
connected by SVG edges.
SVG edge paths SHALL animate from stroke-dashoffset = full to 0 on
scroll-enter (using IntersectionObserver or Framer Motion whileInView).
Nodes SHALL be styled divs that highlight on hover with a tooltip
showing a one-line description of that node type.
The section SHALL appear visually indistinguishable from the real builder.

### Requirement: Feature highlights section
The system SHALL render a 3-column grid (1 column on mobile) with 6 features
arranged in 2 symmetrical rows of 3:

Row 1:
- Visual flow builder: "Design interview flows on an intuitive canvas.
  Connect pages, branches, and logic visually — no code required."
- Conditional logic: "Show or hide questions based on any previous answer.
  Build adaptive flows that respond to each respondent."
- LLM conversation nodes: "Embed scripted or AI-powered chat conversations
  directly in your flow for richer qualitative data."

Row 2:
- Multi-facet round-robin: "Run A/B experimental variants of the same form
  and distribute respondents automatically."
- CSV export: "Export clean, analysis-ready response data with one click.
  Download per-variant or all variants at once."
- Real-time preview: "See exactly what respondents will experience as you
  build. Preview your flow with live color scheme updates."

Each feature SHALL have a lucide-react icon, title, and 2-sentence description.
Features SHALL stagger-animate in on scroll-enter.

### Requirement: How it works section
The system SHALL render a 3-step horizontal timeline (vertical on mobile):
  1. Build — Design your flow on the visual canvas
  2. Publish — Share a link; respondents fill it in
  3. Analyze — Export responses as CSV and draw insights
Each step SHALL reveal with a scroll-triggered Framer Motion animation.

### Requirement: CTA banner section
The system SHALL render a full-width closing section with:
- A strong closing headline (e.g. "Research flows that work as hard as you do.")
- A single "Get started free" button -> /signup

### Requirement: Footer
The system SHALL render a footer with: Parlay logo, nav links (Product,
Docs, Privacy, Terms), and copyright notice.

### Requirement: Accessibility and responsiveness
The system SHALL use Framer Motion for all scroll-triggered animations.
The system SHALL respect prefers-reduced-motion by disabling or reducing
animations when the media query is active.
The system SHALL be fully responsive and tested at breakpoints:
  375px (mobile), 768px (tablet), 1280px (desktop), 1920px (wide).

#### Scenario: Demo canvas edge animation
- GIVEN the user scrolls to the interactive demo section
- WHEN the section enters the viewport
- THEN the SVG edge paths animate from invisible to fully drawn
- AND nodes fade in with a staggered delay

#### Scenario: Reduced motion
- GIVEN the user has prefers-reduced-motion enabled in their OS
- WHEN they load the landing page
- THEN all Framer Motion animations are disabled or replaced with
  instant transitions
- AND the page content is still fully visible and accessible

#### Scenario: Mobile responsiveness
- GIVEN the landing page is viewed at 375px width
- WHEN the feature highlights section renders
- THEN it collapses from 3 columns to 1 column
- AND the How it Works timeline renders vertically instead of horizontally

#### Scenario: Mobile navigation
- GIVEN the landing page is viewed on mobile
- WHEN the user taps the hamburger icon
- THEN a slide-in side menu appears with Sign in, Sign up, and section links
- AND the menu animates in smoothly
