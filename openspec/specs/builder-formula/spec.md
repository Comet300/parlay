# builder-formula Specification

## Purpose
Define the formula language for conditional node visibility expressions,
the recursive descent parser, evaluator, and slug autocomplete behavior.

## Requirements

### Requirement: Formula language grammar
The system SHALL implement an Excel-like boolean formula language for the
"Show if" condition field on all nodes except Start and End.
The condition SHALL evaluate to a boolean. Absent condition = always render.

Supported grammar:
```
expr           -> or_expr
or_expr        -> and_expr | OR '(' args ')'
and_expr       -> not_expr | AND '(' args ')'
not_expr       -> NOT '(' expr ')' | comparison
comparison     -> additive ( ( '>' | '<' | '>=' | '<=' | '=' | '!=' ) additive )?
additive       -> term ( ( '+' | '-' ) term )*
term           -> primary ( ( '*' | '/' ) primary )*
primary        -> NUMBER | STRING | SLUG | '(' expr ')' | func_call
func_call      -> IDENT '(' args ')'
args           -> expr ( ',' expr )*
SLUG           -> [a-z0-9]+(?:-[a-z0-9]+)*
STRING         -> double-quoted literal string
NUMBER         -> integer or decimal literal
```

Built-in functions (in addition to OR, AND, NOT):
- CONTAINS(slug, value) — returns true if the multi_choice array includes
  the value (string match against option labels). For non-array values,
  behaves like `slug = value`.
- LEN(slug) — returns the count of selected items for multi_choice arrays,
  string length for string values, or 0 for undefined/null.

These functions enable meaningful conditions on multi_choice responses
(e.g., `CONTAINS(q-colors, "Red")`, `LEN(q-colors) > 2`).

Reserved words: OR, AND, NOT, CONTAINS, LEN are reserved function names.
The parser SHALL treat these as function calls when followed by '(' and
as errors otherwise. Node slugs SHALL NOT use reserved words — slug
validation SHALL reject slugs that match any reserved word
(case-insensitive comparison).

Note: Content-tier nodes and page-tier LLM nodes have slugs. Container
nodes (Page, PageGroup, Group) and Start/End do not have slugs and
cannot be referenced in formulas. Slugs follow the same URL-safe pattern
as facet nicknames.

### Requirement: Recursive descent parser
The system SHALL implement a recursive descent parser in
app/lib/formula/parser.ts that produces a typed AST from a formula string.
The system SHALL NEVER use eval() anywhere in the formula engine.

### Requirement: Evaluator
The system SHALL implement an AST walker evaluator in
app/lib/formula/evaluator.ts.
The evaluator SHALL accept context: Record<slug, unknown> representing
current session responses (keyed by content node slugs).
An unknown slug SHALL evaluate to undefined.
A comparison involving undefined SHALL return false.
A node whose condition evaluates to false SHALL be skipped in the player.

### Requirement: Unit tests
The system SHALL implement unit tests in app/lib/formula/formula.test.ts
covering at minimum:
- Basic comparisons (>, <, =, !=, >=, <=)
- Nested AND() and OR() expressions
- NOT() expressions
- Arithmetic operators (+, -, *, /)
- String equality and inequality
- Unknown slug evaluates to false
- Complex nested expressions
- CONTAINS() with multi_choice arrays
- CONTAINS() with non-array values (falls back to equality)
- LEN() with arrays, strings, and undefined

### Requirement: Slug autocomplete in the builder
The system SHALL show a dropdown of all content node slugs with their labels
when the user types word characters in the condition formula field.
Slug data SHALL be read from the Zustand builder store (getAllSlugs()).
Selecting a slug from the dropdown SHALL insert it at the cursor position.
The autocomplete SHALL filter the list to slugs matching the typed prefix.
Container nodes (Page, PageGroup, Group) SHALL NOT appear in autocomplete
as they do not have slugs.

### Requirement: Zustand store slug source
The system SHALL implement a Zustand builder store in
app/lib/store/builder.ts with a getAllSlugs() selector that returns
{ slug, label, type }[] from the current content nodes array
(excluding container nodes which have no slugs).
This is the single source of truth for formula autocomplete.

#### Scenario: Unknown slug in condition
- GIVEN a node has condition AND(q-consent = "yes", q-unknown > 0)
- AND q-unknown does not exist in the current facet
- WHEN the formula is evaluated against the session context
- THEN q-unknown resolves to undefined
- AND the comparison q-unknown > 0 returns false
- AND the overall AND() condition is false
- AND the node is not rendered to the respondent

#### Scenario: Condition becomes true mid-session
- GIVEN a node B has condition q-a = "yes"
- AND the respondent has not yet answered node A
- WHEN node B's condition is evaluated
- THEN it returns false and node B is hidden
- WHEN the respondent answers node A with "yes"
- THEN node B's condition re-evaluates to true
- AND node B becomes visible on the current page

#### Scenario: Autocomplete in formula field
- GIVEN the facet has content nodes with slugs: q-age, q-gender, q-consent
- WHEN the user types "q-ag" in the condition field
- THEN the autocomplete dropdown shows "q-age" with its label
- AND selecting it inserts "q-age" at the cursor position
