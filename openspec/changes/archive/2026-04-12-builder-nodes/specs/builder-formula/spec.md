## RENAMED Requirements

- FROM: `### Requirement: Slug autocomplete in the builder`
- TO: `### Requirement: Alias autocomplete in the builder`

- FROM: `### Requirement: Zustand store slug source`
- TO: `### Requirement: Zustand store alias source`

## MODIFIED Requirements

### Requirement: Formula language grammar
The system SHALL implement an Excel-like boolean formula language for
the "Show if" condition field on all nodes except Start and End. The
condition SHALL evaluate to a boolean. An absent condition MUST be
treated as "always render".

Supported grammar:
```
expr           -> or_expr
or_expr        -> and_expr | OR '(' args ')'
and_expr       -> not_expr | AND '(' args ')'
not_expr       -> NOT '(' expr ')' | comparison
comparison     -> additive ( ( '>' | '<' | '>=' | '<=' | '=' | '!=' ) additive )?
additive       -> term ( ( '+' | '-' ) term )*
term           -> primary ( ( '*' | '/' ) primary )*
primary        -> NUMBER | STRING | ALIAS | '(' expr ')' | func_call
func_call      -> IDENT '(' args ')'
args           -> expr ( ',' expr )*
ALIAS          -> [a-z0-9]+(?:-[a-z0-9]+)*
STRING         -> double-quoted literal string
NUMBER         -> integer or decimal literal
```

Built-in functions (in addition to OR, AND, NOT) SHALL include:

- `CONTAINS(alias, value)` — SHALL return `true` if the multi_choice
  array bound to `alias` includes `value` (string match against option
  labels). For non-array values, the function MUST behave like
  `alias = value`.
- `LEN(alias)` — SHALL return the count of selected items for
  multi_choice arrays, the string length for string values, or `0`
  for `undefined`/`null`.

These functions enable meaningful conditions on multi_choice responses
(e.g., `CONTAINS(q-colors, "Red")`, `LEN(q-colors) > 2`).

Reserved words: `OR`, `AND`, `NOT`, `CONTAINS`, `LEN` SHALL be reserved
function names. The parser SHALL treat these as function calls when
followed by `'('` and as errors otherwise. Node aliases MUST NOT use
reserved words — alias validation SHALL reject aliases that match any
reserved word (case-insensitive comparison).

Note: Response-bearing nodes (card, likert, single_choice,
multi_choice, email_collection) and page-tier LLM nodes (scripted_llm,
real_llm) MAY carry an alias. Container nodes (Page, PageGroup, Group)
and anchor nodes (Start, End) MUST NOT have an alias and cannot be
referenced in formulas. Aliases follow the same lowercase/hyphen
pattern as facet nicknames but are an entirely distinct concept (an
alias is a per-node formula identifier; a facet nickname is a per-facet
URL slug).

#### Scenario: Parser tokenizes a comparison expression
- **WHEN** the parser receives the formula `q-age > 18`
- **THEN** it SHALL produce a comparison AST node with left = ALIAS("q-age"), operator = ">", and right = NUMBER(18)
- **AND** SHALL NOT raise an error

#### Scenario: Reserved word as alias is rejected
- **GIVEN** the user types alias `or` on a Likert node
- **WHEN** the alias validator runs
- **THEN** it SHALL reject the alias
- **AND** the inline editor SHALL show a validation error

### Requirement: Recursive descent parser
The system SHALL implement a recursive descent parser in
`src/lib/formula/parser.ts` that produces a typed AST from a formula
string. The system MUST NEVER use `eval()` anywhere in the formula
engine.

#### Scenario: Parser file lives under src
- **WHEN** a developer searches the repository for the parser implementation
- **THEN** the file SHALL be located at `src/lib/formula/parser.ts`
- **AND** there MUST NOT be a corresponding file under `app/lib/formula/`

### Requirement: Evaluator
The system SHALL implement an AST walker evaluator in
`src/lib/formula/evaluator.ts`. The evaluator SHALL accept a context
of type `Record<alias, unknown>` representing current session
responses keyed by response-bearing node aliases. An unknown alias
SHALL evaluate to `undefined`. A comparison involving `undefined`
SHALL return `false`. A node whose `condition` evaluates to `false`
SHALL be skipped in the player.

#### Scenario: Unknown alias in condition
- **GIVEN** a node has condition `AND(q-consent = "yes", q-unknown > 0)`
- **AND** `q-unknown` does not exist in the current facet
- **WHEN** the formula is evaluated against the session context
- **THEN** `q-unknown` SHALL resolve to `undefined`
- **AND** the comparison `q-unknown > 0` SHALL return `false`
- **AND** the overall `AND()` SHALL return `false`
- **AND** the node SHALL NOT be rendered

#### Scenario: Condition becomes true mid-session
- **GIVEN** a node B has condition `q-a = "yes"`
- **AND** the respondent has not yet answered node A
- **WHEN** node B's condition is evaluated
- **THEN** it SHALL return `false` and node B SHALL be hidden
- **WHEN** the respondent answers node A with `"yes"`
- **THEN** node B's condition SHALL re-evaluate to `true`
- **AND** node B SHALL become visible on the current page

### Requirement: Unit tests
The system SHALL implement unit tests in
`src/lib/formula/formula.test.ts` covering at minimum:

- Basic comparisons (`>`, `<`, `=`, `!=`, `>=`, `<=`)
- Nested `AND()` and `OR()` expressions
- `NOT()` expressions
- Arithmetic operators (`+`, `-`, `*`, `/`)
- String equality and inequality
- Unknown alias evaluating to `false`
- Complex nested expressions
- `CONTAINS()` with multi_choice arrays
- `CONTAINS()` with non-array values (falls back to equality)
- `LEN()` with arrays, strings, and `undefined`

#### Scenario: Test suite covers unknown alias behavior
- **WHEN** the test runner executes `formula.test.ts`
- **THEN** at least one test case SHALL assert that an unknown alias resolves to `undefined`
- **AND** at least one test case SHALL assert that a comparison with `undefined` returns `false`

### Requirement: Alias autocomplete in the builder
The system SHALL show a dropdown of all response-bearing node aliases
with their labels when the user types word characters in the condition
formula field. Alias data SHALL be read from the Zustand builder store
via the `aliases` derived state slice
(`useBuilderStore((s) => s.aliases)`). Selecting an alias from the
dropdown SHALL insert it at the cursor position. The autocomplete
SHALL filter the list to aliases matching the typed prefix. Container
nodes (Page, PageGroup, Group) and anchor nodes (Start, End) MUST NOT
appear in the autocomplete list because they have no alias.

Nodes whose `data.alias` is the empty string MUST be excluded from the
autocomplete list — there is nothing to insert.

#### Scenario: Autocomplete in formula field
- **GIVEN** the facet has response-bearing nodes with aliases `q-age`, `q-gender`, `q-consent`
- **WHEN** the user types `q-ag` in the condition field
- **THEN** the autocomplete dropdown SHALL show `q-age` with its label
- **AND** selecting it SHALL insert `q-age` at the cursor position

#### Scenario: Empty-alias node is omitted from autocomplete
- **GIVEN** a Likert node with `alias = ""`
- **WHEN** the user opens the condition field on a sibling node
- **THEN** the autocomplete list MUST NOT include the empty-alias node

### Requirement: Zustand store alias source
The system SHALL implement a Zustand builder store at
`src/lib/stores/builder-store.ts` that exposes a derived
`aliases: AliasInfo[]` state slice containing
`{ alias, label, type, nodeId }` entries for every response-bearing
node with a non-empty alias. This slice SHALL be the single source of
truth for formula autocomplete.

The store SHALL also expose `aliasConflicts: AliasConflict[]` listing
duplicate aliases (`{ alias, nodeIds }` where `nodeIds.length > 1`).
Both slices MUST be recomputed on every node mutation via the store's
`withDerived` helper, using stable-array caching to avoid unnecessary
re-renders.

#### Scenario: Store exposes aliases for autocomplete
- **GIVEN** the facet has 3 response-bearing nodes, 2 of which have non-empty aliases
- **WHEN** a consumer calls `useBuilderStore((s) => s.aliases)`
- **THEN** the returned array SHALL contain exactly 2 `AliasInfo` entries

#### Scenario: Store exposes alias conflicts
- **GIVEN** two response-bearing nodes both have `alias: "q-age"`
- **WHEN** a consumer reads `useBuilderStore((s) => s.aliasConflicts)`
- **THEN** the returned array SHALL contain one `{ alias: "q-age", nodeIds: [...] }` entry with `nodeIds.length === 2`
