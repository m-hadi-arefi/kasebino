# ARD-XXX — Title

| Field | Value |
| --- | --- |
| ID | ARD-XXX |
| Title | |
| Status | `todo` |
| Milestone | |
| Owner | |
| Last updated | |
| Source | PRD.md |

## Objective

## Business Value

## Requirements

## Dependencies

## Architecture

## Domain Model

## API Contracts

## Events

## Caching

## Security

## UI Requirements

- uiuxpromax REQUIRED / NOT APPLICABLE
- Persian + RTL REQUIRED for merchant/customer UI

## Localization Requirements

- Default `fa-IR`; Persian user-facing copy

## RTL Requirements

- RTL-first; logical CSS; mirrored directional icons

## Persian UX Requirements

- Persian typography; Jalali dates; تومان formatting where applicable

## Iranian User Considerations

- Iranian phone/SMS, retail workflows, Android mobile; pass `docs/checklists/iranian-feature-checklist.md`

## Analytics / Audit / Tracking Requirements

- Required analytics events:
- Required audit events:
- Required tracking events:
- Required dashboard metrics:

(Or explicit N/A with rationale.)

## Persistence Strategy

**OLTP ORM:** Drizzle ORM  
**Analytics DB:** MongoDB (if applicable)

### Required Schema

### Required Migrations

### Repository Interfaces

### Repository Implementations

### Transaction Boundaries

### Caching Strategy

## Database Design

### Tables / Collections

### Relationships

### Constraints

### Indexes

### Query Patterns

### Estimated Load

### Caching Plan

### Migration Plan

## Testing

## Acceptance Criteria

- [ ]

## Definition of Done

Inherits global DoD. Must pass **Iranian feature checklist** for any user-facing scope.

## Implementation Checklist

- [ ]

## Validation Checklist

- [ ] iranian-first-development.md conformance
- [ ] iranian-feature-checklist.md passed (or N/A with reason)
- [ ]

## Completion Protocol

Update STATUS + progress-log; only complete after validation.
