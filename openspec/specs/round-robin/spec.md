# round-robin Specification

## Purpose
Distribute respondents sequentially across active facets of a form using
an atomic Postgres counter and FingerprintJS visitor IDs.

## Requirements

### Requirement: Atomic counter function
The system SHALL use the following Postgres function to atomically increment
the counter and return a zero-based facet index:

```sql
CREATE OR REPLACE FUNCTION increment_round_robin(p_form_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_counter integer;
  v_facet_count integer;
BEGIN
  SELECT COUNT(*) INTO v_facet_count
  FROM facets WHERE form_id = p_form_id AND status = 'active';

  UPDATE forms SET round_robin_counter = round_robin_counter + 1
  WHERE id = p_form_id RETURNING round_robin_counter INTO v_counter;

  RETURN (v_counter - 1) % GREATEST(v_facet_count, 1);
END; $$;
```

Facets SHALL be ordered by created_at ASC, id ASC when resolving the
index to a facet (id as secondary tiebreaker for identical timestamps).

### Requirement: Assignment logging
The system SHALL maintain a round_robin_log table:
- id: uuid pk default gen_random_uuid()
- form_id: uuid fk -> forms ON DELETE CASCADE
- facet_id: uuid fk -> facets ON DELETE CASCADE
- facet_nickname: text not null (snapshot at assignment time)
- visitor_id: text not null (FingerprintJS or fallback visitor ID)
- assigned_at: timestamptz default now()

The system SHALL enforce a unique constraint on (visitor_id, form_id)
to prevent duplicate assignments from concurrent requests:
  CREATE UNIQUE INDEX idx_round_robin_log_visitor_form
    ON round_robin_log (visitor_id, form_id);

On conflict (concurrent duplicate), the system SHALL use the existing
assignment rather than inserting a second row.

RLS: public INSERT, owner SELECT only.
This log SHALL be retained permanently for analytics — never deleted
(except via CASCADE when the form or facet is deleted).

### Requirement: Toggle behavior
The system SHALL allow round_robin_enabled to be toggled on forms from
the builder's Form Settings tab.
When toggled OFF with multiple active facets: the system SHALL prompt the
user to select a default facet before committing the toggle.
When toggled ON: the default facet requirement is cleared.

### Requirement: Archived facets excluded
The system SHALL exclude facets with status = 'archived' from round-robin
consideration and from the active facet count in the counter function.

### Requirement: Single active facet shortcut
When round_robin_enabled = true but only one active facet exists, the system
SHALL assign that facet directly without incrementing the counter.

#### Scenario: First visit, N>1 active facets
- GIVEN a form has round_robin_enabled = true
- AND 3 active facets ordered [A, B, C] by created_at ASC, id ASC
- AND no prior round_robin_log entry for this visitor_id + form_id
- WHEN a respondent visits /:formId (after visitor_id is determined)
- THEN the system calls increment_round_robin and gets the index
- AND assigns the corresponding facet
- AND inserts into round_robin_log
- AND sets the URL to ?v={assignedNickname}

#### Scenario: Return visit
- GIVEN visitor_id "abc123" was previously assigned to facet "horizon"
- WHEN the same visitor loads /:formId again
- THEN the system finds their round_robin_log entry
- AND sets the URL to ?v=horizon without incrementing the counter

#### Scenario: Toggle OFF prompt
- GIVEN a form has round_robin_enabled = true and 3 active facets
- WHEN the owner toggles round_robin_enabled to false
- THEN the system shows an inline prompt to select the default facet
- AND only commits the toggle after the user confirms a selection
