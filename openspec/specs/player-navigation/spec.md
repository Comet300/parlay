# player-navigation Specification

## Purpose
Define the respondent's navigation model through the form: the Continue
button pattern, Back button, within-page scrolling, checkpoint-based
progress bar, and the directed graph traversal engine — all within a
single-page application that never changes the URL after initial load.

## Requirements

### Requirement: Single-page navigation model
The form player is a single-page application at /:formId?v={nickname}.
After initial facet resolution sets the ?v= parameter, the URL SHALL
NOT change again for the duration of the session. All navigation —
pages, virtual pages, LLM conversations, submission, End screen — is
driven by client-side state transitions. The browser's native back/forward
buttons SHALL NOT be used for form navigation.

### Requirement: Browser navigation protection
The system SHALL register a `beforeunload` event handler that triggers
when `session.responses` contains at least one non-null entry (i.e., the
respondent has answered at least one question). The handler SHALL display
the browser's native "You have unsaved responses" confirmation dialog.
The handler SHALL be removed after successful submission.

The system SHALL push a history entry (via `history.pushState`) each time
the respondent navigates to a new page-tier node within the form. This
ensures that the browser's Back button navigates within the form (returning
to the previous page-tier node) instead of leaving the form entirely.
When the browser Back event fires (via `popstate` listener), the system
SHALL navigate to the previous visited page-tier node using the same logic
as the in-form Back button. If no previous page exists (respondent is on
the first page), the `popstate` handler SHALL push the current state back
to prevent leaving.

### Requirement: Start node rendering
After Phase 2 resolution, the player SHALL render the Start node as the
first screen. If the Start node has non-empty markdownContent, the player
SHALL render it as a centered card with a Continue button at the bottom.
If the Start node has no markdownContent (empty/absent), the player SHALL
skip the Start screen entirely and immediately follow the Start node's
outgoing edge to render the first page-tier node.
The Start node content is optional — forms may begin directly at the
first page without an intro screen.

### Requirement: Continue button pattern
Every screen (a Page, a virtual page within a PageGroup, a Scripted LLM
session, a Real LLM session) SHALL end with a Continue button at the bottom.
For question/content pages: the Continue button SHALL be active only when
all nodes with required = true on the current page have a non-null response.
For Card nodes: the card's buttons ARE the Continue mechanism.
No separate Continue button is shown for Card nodes.
For LLM nodes: the Continue button SHALL appear at the bottom of the chat
after the conversation ends (maxTurns reached or [END_CONVERSATION] detected).
Whenever a Continue button appears, the system SHALL smooth-scroll to it.

### Requirement: Within-page scroll behavior
When a conditional node becomes visible on the current page because its
condition formula evaluated to true after a new answer, the system SHALL
smooth-scroll to the newly visible node.
Navigating to a new Page or virtual page SHALL always scroll to the top.

### Requirement: Condition re-evaluation debounce
The system SHALL re-evaluate all condition formulas on the current page
when any response value changes. Re-evaluation SHALL be debounced at
1.5 seconds after the last input change to avoid excessive recalculation.
For discrete inputs (radio click, checkbox toggle, likert button press),
the debounce starts from the click event. For text inputs (email field),
the debounce starts from the last keystroke.

### Requirement: Back button
The system SHALL show a Back button (bottom-left of screen) on a Page or
virtual page when allow_back = true on the parent Page or PageGroup node.
Clicking Back from a Page SHALL navigate to the previous visited Page node.
Clicking Back from a virtual page within a PageGroup SHALL navigate to the
previous virtual page within the same PageGroup.
Clicking Back from the first virtual page of a PageGroup SHALL navigate to
the previous Page node before the PageGroup.

The system SHALL NOT allow navigation back to LLM nodes (scripted_llm or
real_llm). If the previous visited node was an LLM node, the Back button
SHALL be hidden on the current page — the respondent cannot re-enter a
completed LLM conversation. Similarly, the respondent cannot leave an
active LLM conversation — there is no Back button during LLM full-screen
takeover.

### Requirement: Checkpoint-based progress bar
The system SHALL implement an opt-in checkpoint-based progress bar.
Page and PageGroup nodes each have:
- show_progress_bar: boolean — controls whether the bar is visible on that screen
- is_checkpoint: boolean — marks this page as a progress milestone

The progress bar SHALL be shown on any screen whose parent Page or
PageGroup has show_progress_bar = true.

Progress calculation:
- Total = count of reachable checkpoint Pages/PageGroups whose condition
  evaluates to true + 1 (the End node acts as a virtual checkpoint)
- Passed = count of checkpoint Pages/PageGroups the respondent has entered
- Progress = passed / total
- Checkpoints increment when the respondent ENTERS a checkpoint page
  (not when they leave it)
- The respondent SHALL never see 100% during the form because 100%
  corresponds to reaching the End node (form complete)
- The progress bar SHALL be hidden during full-screen LLM conversation phases
- The progress bar SHALL update dynamically as condition evaluations change
  the set of reachable checkpoints

### Requirement: Graph traversal engine
The system SHALL implement a directed graph traversal engine in
app/components/player/GraphTraverser.tsx.
After each page-tier node completes (Continue clicked):
- For a Page or PageGroup without Card routing: follow the node's single
  outgoing edge
- For a Page or PageGroup containing a Card node whose button was clicked:
  follow the outgoing edge from that button's sourceHandle. If the Card is
  on a virtual page that is NOT the last virtual page of a PageGroup, the
  Card's button edge takes precedence — remaining virtual pages are skipped
  and routing follows the Card's target immediately.
- If the Card has no button clicked (i.e., the user presses Continue on a
  virtual page that doesn't contain a Card), continue to the next virtual
  page within the PageGroup as normal. Only when all virtual pages are
  exhausted does the system follow the PageGroup's outgoing edge.
- For scripted_llm / real_llm: follow the node's single outgoing edge
- If the next page-tier node's condition formula evaluates to false:
  skip it and follow its outgoing edge immediately without rendering it
- On reaching an End node: trigger the submission flow

### Requirement: Question node routing
Single choice, multi choice, and likert nodes SHALL always follow the single
outgoing edge of their parent Page or PageGroup.
These node types do NOT have per-option routing — branching is exclusively
accomplished via Card node buttons.

### Requirement: Page header content rendering
When a Page has non-empty headerContent, the player SHALL render the
markdown content at the top of the page, above all child nodes.
When a PageGroup has non-empty headerContent:
- If headerOnAllPages = false: show headerContent only on the first virtual page
- If headerOnAllPages = true: show headerContent on every virtual page

#### Scenario: Start node with content
- GIVEN a Start node has markdownContent "Welcome to our research study."
- WHEN the player finishes Phase 2 resolution
- THEN the Start node renders as a centered card with the markdown content
- AND a Continue button is shown at the bottom
- WHEN the respondent clicks Continue
- THEN the player follows the Start node's outgoing edge

#### Scenario: Start node without content
- GIVEN a Start node has empty markdownContent
- WHEN the player finishes Phase 2 resolution
- THEN the Start screen is skipped entirely
- AND the player immediately follows the Start node's outgoing edge

#### Scenario: Back from page after LLM node
- GIVEN the flow is Page A -> real_llm -> Page B (allow_back = true)
- AND the respondent has completed the LLM conversation and is on Page B
- WHEN Page B renders
- THEN the Back button is hidden (previous node was an LLM node)

#### Scenario: Continue blocked by required field
- GIVEN a page has a required Likert node and an optional Single Choice node
- WHEN the respondent has not answered the Likert
- THEN the Continue button is disabled
- WHEN the respondent answers the Likert
- THEN the Continue button becomes active
- AND the respondent can proceed

#### Scenario: Conditional node appears mid-page
- GIVEN a page has node A (always visible) and node B (condition: q-a = "yes")
- WHEN the respondent selects "yes" for node A
- THEN node B's condition evaluates to true and it becomes visible
- AND the system smooth-scrolls to node B

#### Scenario: Skip false-condition page
- GIVEN Page 3 has condition q-branch = "detailed"
- AND the respondent answered q-branch = "quick"
- WHEN Continue is clicked on Page 2
- THEN the traversal engine evaluates Page 3's condition as false
- AND skips Page 3 entirely
- AND proceeds to the next page-tier node along Page 3's outgoing edge

#### Scenario: Card in PageGroup mid-virtual-page
- GIVEN a PageGroup has 3 virtual pages [VP1, VP2, VP3]
- AND VP2 contains a Card with button "Skip ahead" targeting Page X
- WHEN the respondent clicks "Skip ahead" on VP2
- THEN VP3 is skipped entirely
- AND the system follows the Card button's edge to Page X

#### Scenario: PageGroup virtual pages without Card
- GIVEN a PageGroup has 3 virtual pages [VP1, VP2, VP3]
- AND no virtual page contains a Card node
- WHEN the respondent clicks Continue on VP1
- THEN the system advances to VP2 (next virtual page)
- WHEN the respondent clicks Continue on VP3 (last virtual page)
- THEN the system follows the PageGroup's outgoing edge

#### Scenario: Back across PageGroup virtual pages
- GIVEN a PageGroup has 3 virtual pages (VP1, VP2, VP3) with allow_back = true
- AND the respondent is on VP3
- WHEN they click Back
- THEN the system navigates to VP2

#### Scenario: Back exits PageGroup
- GIVEN a PageGroup has allow_back = true
- AND the respondent is on VP1 (the first virtual page of the group)
- WHEN they click Back
- THEN the system navigates to the previous Page node before the PageGroup

#### Scenario: Checkpoint progress bar
- GIVEN a form has 4 checkpoint pages and the End node (total = 5)
- AND the respondent has entered checkpoint pages 1 and 2
- WHEN the progress bar renders
- THEN it shows 2/5 = 40% progress
- AND the respondent never sees 100% until the form is submitted

#### Scenario: Continue button scroll
- GIVEN a real_llm conversation just ended
- WHEN the Continue button appears at the bottom of the chat
- THEN the system smooth-scrolls to the Continue button

#### Scenario: Beforeunload warning with responses
- GIVEN a respondent has answered at least one question (session has responses)
- WHEN they attempt to close or refresh the browser tab
- THEN the browser shows a native "You have unsaved responses" confirmation dialog

#### Scenario: Browser back navigates within form
- GIVEN a respondent has navigated from Page A to Page B within the form
- WHEN they press the browser's Back button
- THEN the popstate handler fires and navigates to Page A (within the form)
- AND the URL does not change (still /:formId?v={nickname})

#### Scenario: Browser back on first page
- GIVEN a respondent is on the first page of the form (no previous pages)
- WHEN they press the browser's Back button
- THEN the popstate handler pushes the current state back
- AND the respondent stays on the first page
