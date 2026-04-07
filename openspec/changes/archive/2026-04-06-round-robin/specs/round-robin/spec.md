## ADDED Requirements

### Requirement: Toggle-OFF default facet prompt UI
When the user toggles round_robin_enabled to false and multiple active facets
exist, the system SHALL show an inline select dropdown within the FacetSwitcher
component listing all active facets by nickname. The toggle SHALL NOT commit
until the user selects a facet and confirms. On confirmation, the system SHALL:
1. Call the existing change-default-facet transaction to set `is_default = true`
   on the selected facet
2. Call `updateFormRoundRobin({ formId, enabled: false })`
Both operations SHALL complete before the UI reflects the change.
The default-first ordering avoids a window where round-robin is OFF but no
default facet exists (which would render the form unavailable to visitors).

When toggling ON, the system SHALL commit immediately with no prompt.

When toggling OFF with only one active facet, the system SHALL auto-select
that facet as default and commit without prompting.

#### Scenario: Toggle OFF with 3 active facets
- **WHEN** the user toggles round-robin OFF and facets [A, B, C] are active
- **THEN** the system shows a dropdown listing A, B, C by nickname
- **WHEN** the user selects B and confirms
- **THEN** the system disables round-robin and sets B as the default facet

#### Scenario: Toggle OFF with 1 active facet
- **WHEN** the user toggles round-robin OFF and only facet A is active
- **THEN** the system auto-selects A as default and commits immediately

#### Scenario: Toggle ON
- **WHEN** the user toggles round-robin ON
- **THEN** the system enables round-robin immediately with no prompt

### Requirement: Round-robin assignment with conflict handling
When inserting into round_robin_log, the system SHALL use
`INSERT ... ON CONFLICT (visitor_id, form_id) DO NOTHING` and then SELECT
the existing row to retrieve the previously assigned facet. This handles
the race condition where concurrent requests for the same visitor both
call `increment_round_robin` before either inserts.

#### Scenario: Concurrent duplicate assignment attempt
- **WHEN** two simultaneous requests arrive for the same visitor_id and form_id
- **THEN** both call `increment_round_robin` (counter increments twice)
- **THEN** the first INSERT succeeds; the second hits the unique constraint
- **THEN** the second request reads the existing assignment and uses it
- **THEN** the visitor receives the facet from the first assignment
