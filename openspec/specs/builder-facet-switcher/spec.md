# builder-facet-switcher Specification

## Purpose
Define the facet switcher dropdown in the builder toolbar that enables
navigation between facets and creation of new facets for the same form.

## Requirements

### Requirement: Facet list display
The system SHALL list all facets of the current form by nickname in the
switcher dropdown. The currently active facet SHALL be visually highlighted.
All facets SHALL be listed regardless of status (draft, active, archived).

### Requirement: Facet navigation
Clicking a facet nickname in the dropdown SHALL navigate to /build/{thatFacetId}.

### Requirement: Create new facet
The system SHALL show a "+ Create facet" option at the bottom of the dropdown.
Selecting it SHALL show an inline nickname input within the dropdown.
On confirm (Enter key or confirm button):
1. The system SHALL validate the nickname matches /^[a-z0-9]+(?:-[a-z0-9]+)*$/
   and is between 1-60 characters
2. The system SHALL deep-copy the current facet's flow_definition and color_scheme
3. The system SHALL create a new facets row with is_default = false and status = 'draft'
4. The system SHALL navigate to /build/{newFacetId}
The new facet SHALL be fully independent — edits SHALL NOT affect the source.

### Requirement: Set as default
When round_robin_enabled = false and the form has >1 facet, the system
SHALL show an inline "Default:" dropdown at the bottom of the switcher
listing all facets. Changing the selection SHALL execute the two-step
SQL transaction to update is_default. The dropdown SHALL be hidden when
round_robin_enabled = true.

### Requirement: Rename facet
The system SHALL provide a rename option per facet via a context menu or
inline edit within the dropdown.
Renaming SHALL follow all rules defined in the facet-nicknames spec:
- Insert old nickname into facet_nickname_history
- Validate new nickname matches /^[a-z0-9]+(?:-[a-z0-9]+)*$/ (1-60 chars)
- Validate new nickname is not taken by any non-archived sibling or in history
- Update facets.nickname on success

### Requirement: Nickname validation on create
When creating a new facet, the system SHALL validate the entered nickname:
- Matches pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/ (1-60 chars)
- Not already used by any sibling facet (non-archived)
- Not in facet_nickname_history for any sibling facet

#### Scenario: Create new facet
- GIVEN the user opens the facet switcher in the builder
- WHEN they select "+ Create facet" and enter "variant-b"
- AND confirm the creation
- THEN the system deep-copies the current facet
- AND creates a new facets row with nickname "variant-b" and status "draft"
- AND navigates to /build/{newFacetId}
- AND the new facet is listed in the switcher dropdown

#### Scenario: Set as default via dropdown
- GIVEN round_robin_enabled = false on the form
- AND the form has 3 facets: "default" (default), "variant-a", "variant-b"
- WHEN the user selects "variant-a" from the "Default:" dropdown
- THEN the system executes the two-step SQL transaction
- AND "variant-a" becomes is_default = true
- AND "default" becomes is_default = false

#### Scenario: Rename conflict rejection
- GIVEN facets "sunrise" and "horizon" exist on the form
- WHEN the user tries to rename "sunrise" to "horizon"
- THEN the system shows an error: the nickname is already in use
- AND suggests the user rename "horizon" first

#### Scenario: Invalid nickname on create
- GIVEN the user enters "My Variant!" in the create nickname input
- WHEN they confirm
- THEN the system shows a validation error: nickname must be lowercase
  alphanumeric with hyphens only
