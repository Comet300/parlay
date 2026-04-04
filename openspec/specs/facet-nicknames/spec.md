# facet-nicknames Specification

## Purpose
Manage facet nickname lifecycle including mutation, history tracking for
3xx redirects, swap prevention between sibling facets, and URL slug validation.

## Requirements

### Requirement: Nickname URL pattern
Nicknames SHALL match the pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/
(lowercase alphanumeric segments separated by single hyphens, no leading/
trailing hyphens, no consecutive hyphens). Minimum 1 character, maximum
60 characters.
The default nickname for the first facet of a new form is "default".

### Requirement: Nickname history table
The system SHALL maintain a facet_nickname_history table:
- id: uuid pk default gen_random_uuid()
- facet_id: uuid not null fk -> facets ON DELETE CASCADE
- old_nickname: text not null
- changed_at: timestamptz default now()

### Requirement: History on rename
When a facet is renamed, the system SHALL:
1. Insert the old nickname into facet_nickname_history
2. Validate the new nickname matches the URL pattern
3. Validate the new nickname is not taken (see swap prevention below)
4. Update facets.nickname to the new value

### Requirement: Permanent nickname reservation
Old nicknames recorded in facet_nickname_history for any facet in a form
SHALL be permanently reserved within that form.
No other facet in the same form SHALL be assigned a nickname that appears
in the history of any sibling facet.
This preserves 3xx redirect integrity indefinitely.

### Requirement: Swap prevention
The system SHALL reject a rename if the new nickname is currently held by
any non-archived sibling facet in the same form.
The error message SHALL suggest renaming the occupying facet to a temporary
name first before attempting the swap.

### Requirement: 3xx redirect for stale URLs
When /:formId?v={nickname} resolves to no active facet, the system
SHALL query facet_nickname_history joined with facets to find the current
nickname for the facet that previously held that nickname.
If a current nickname is found: the system SHALL 301 redirect to
/:formId?v={currentNickname}.
If no match is found: the system SHALL return 404.

#### Scenario: Successful rename
- GIVEN a facet has nickname "sunrise"
- WHEN the owner renames it to "dawn"
- THEN "sunrise" is inserted into facet_nickname_history
- AND facets.nickname is updated to "dawn"
- AND "sunrise" is permanently reserved in this form

#### Scenario: Old URL redirect
- GIVEN a facet was renamed from "sunrise" to "dawn"
- WHEN a respondent visits /:formId?v=sunrise
- THEN the system finds "sunrise" in facet_nickname_history
- AND 301 redirects to /:formId?v=dawn

#### Scenario: Swap rejection
- GIVEN facet A has nickname "control" and facet B has nickname "variant"
- WHEN the owner tries to rename facet A to "variant"
- THEN the system rejects the rename with an error
- AND suggests renaming facet B to a temporary name first

#### Scenario: History nickname blocked
- GIVEN facet A previously had nickname "pilot" (now renamed to "alpha")
- WHEN the owner tries to give facet B the nickname "pilot"
- THEN the system rejects it because "pilot" is in facet_nickname_history

#### Scenario: Invalid nickname pattern
- GIVEN a user tries to rename a facet to "My Variant!"
- WHEN the system validates the nickname
- THEN it rejects it because it does not match /^[a-z0-9]+(?:-[a-z0-9]+)*$/
- AND shows an inline validation error
