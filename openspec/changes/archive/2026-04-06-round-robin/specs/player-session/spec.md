## MODIFIED Requirements

### Requirement: Resume prompt
The system SHALL offer a "Resume where you left off" vs "Start fresh" prompt when:
- A parlay_session_{formId} entry exists in localStorage, AND
- The stored facetNickname matches the currently resolved facet nickname

Choosing "Resume" SHALL restore visitedPageIds, currentVirtualPageIndex,
responses, shuffleSeeds, and checkpointsPassed, then navigate to the last
visited position.
Choosing "Start fresh" SHALL clear the session and begin from the Start node.

When the resolved facet nickname does NOT match the stored session's
facetNickname (e.g., visitor was re-assigned to a different facet), the
system SHALL silently discard the stale session and start fresh without
prompting. This covers the case where a facet was archived and the visitor
is resolved to a different facet on their next visit.

#### Scenario: Resume after browser close
- **WHEN** a respondent with an existing session returns to /:formId
- **THEN** Phase 2 resolves to the same facet via fingerprint
- **THEN** the system finds the localStorage session with matching facetNickname
- **THEN** offers "Resume where you left off" vs "Start fresh"

#### Scenario: Facet mismatch discards session
- **WHEN** a session exists with facetNickname = "horizon"
- **THEN** but the visitor is now resolved to facet "compass"
- **THEN** the system discards the "horizon" session without prompting
- **THEN** starts fresh with facet "compass"
