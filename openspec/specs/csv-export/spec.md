# csv-export Specification

## Purpose
Define CSV export functionality for form response data, accessible via a
modal on the dashboard with per-facet downloads and a Download All option.

## Requirements

### Requirement: Export modal
The system SHALL show a CSV export modal when "Export CSV" is clicked on
any facet chip in the dashboard form card.
The modal SHALL list all facets of the form (including archived ones) as
individual download buttons, each labeled with the facet nickname and a
status chip.
The modal SHALL include a "Download All" button that packages all facets'
CSVs into a single ZIP archive.

### Requirement: Authentication and ownership
The /api/export/:facetId and /api/export/zip/:formId routes SHALL be
implemented as TanStack Start server routes using `createFileRoute` with
`server.handlers` at `src/routes/api/export/$facetId.ts` and
`src/routes/api/export/zip/$formId.ts`. Both routes SHALL require a valid
BetterAuth session and validate that the requesting user owns the form
via RLS (using the user's JWT).
Unauthorized requests SHALL receive a 403 response.

### Requirement: Single facet CSV generation
Filename: parlay-{facetNickname}-{facetId}.csv

The sparse matrix SHALL be built as follows:
1. Fetch all content node slugs and labels from the current facets.flow_definition
   where record_response = true (this is the authoritative column list —
   NOT the responses table). Nodes with record_response = false SHALL be
   excluded from the CSV entirely (no column generated).
   Column headers SHALL use the latest node_label from flow_definition.
   It is the form owner's responsibility to manage label changes between
   respondents.
2. Fetch all submissions and responses rows for this facet
3. For each submission, for each included node slug:
   - If a responses row exists with value not null: use its value
   - Otherwise (unvisited or null value): use N/A

Columns in order:
  submission_id, submitted_at, is_complete, respondent_email,
  facet_nickname, then one column per content node (with record_response = true)
  ordered by position in the interview flow: nodes that appear earlier in
  the respondent's journey produce columns that appear earlier in the CSV.

  Ordering rules:
  - Traverse the directed graph starting from the Start node
  - Within each page-tier container, children appear in canvas position
    order (top-to-bottom)
  - When the graph branches (e.g., via Card button edges), group each
    branch's columns together contiguously
  - Branch ordering tiebreaker: alphabetical by the slug of the first
    content node on each branch
  - Column headers use the current node_label from flow_definition

Value formatting:
  Multi-choice: join selected option labels with semicolon (;)
  LLM conversation: serialize full array as JSON string
  Skipped/unvisited: N/A

### Requirement: Download All ZIP
Route: /api/export/zip/:formId
The system SHALL generate one CSV per facet using the above single-facet logic.
The system SHALL package all CSVs into a ZIP archive using a streaming ZIP
library (archiver or jszip — check Context7 for TanStack Start compatibility).
The ZIP filename SHALL be: parlay-{formTitle}-all.zip
The system SHALL stream the ZIP to the client.

### Requirement: HTTP response headers
Both export routes SHALL set:
  Content-Disposition: attachment; filename="{filename}"
  Content-Type: text/csv (single) or application/zip (all)

#### Scenario: Sparse matrix for conditional nodes
- GIVEN a facet has nodes: A (always shown), B (condition: q-a="yes"), C (always shown)
- AND respondent 1 answered A="yes" (so B was shown) and C
- AND respondent 2 answered A="no" (so B was not shown) and C
- WHEN the CSV is generated
- THEN the column headers are: ..., A_label, B_label, C_label
  (using the latest labels from flow_definition)
- AND respondent 1's row has values for A, B, and C
- AND respondent 2's row has values for A, N/A for B, and value for C

#### Scenario: record_response = false node excluded from CSV
- GIVEN a node "q-screening" has record_response = false
- AND the respondent answered it during the session
- WHEN the CSV is generated
- THEN q-screening does NOT appear as a column in the CSV at all
  (it is excluded from the export entirely)

#### Scenario: Download All
- GIVEN a form has 4 facets: sunrise, horizon, compass, atlas
- WHEN the owner clicks "Download All"
- THEN the system generates 4 CSV files
- AND packages them as parlay-{formTitle}-all.zip
- AND streams the ZIP to the browser as a download

#### Scenario: LLM conversation in CSV
- GIVEN a real_llm node with record_response = true
- AND a respondent completed the conversation with 3 turns
- WHEN the CSV is generated
- THEN the cell contains a JSON string:
  [{"role":"user","content":"..."}, {"role":"assistant","content":"..."}, ...]
