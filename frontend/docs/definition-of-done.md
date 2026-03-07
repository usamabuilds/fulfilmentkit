# FulfilmentKit Frontend V1.1 Definition of Done (DoD)

This is a non negotiable quality gate.
A page is NOT done unless it meets ALL items below.

## 1) Page states (Required on every page)
Every page must implement ALL of the following states:

### 1.1 Loading state
- Shown while data is being fetched or computed.
- Must be visible and clear that work is in progress.
- Must not flash incorrectly (do not show empty state while loading).

### 1.2 Empty state
- Shown when the request succeeded but returned no usable results for the UI.
- Must explain what empty means in that context.
- Must offer at least one next action when reasonable (example: change filter, add first item, connect account).

### 1.3 Error state
- Shown when request fails or validation fails.
- Must use the standard error surface:
  - <FkError error={error} />
- Must not swallow errors silently.

## 2) Accessibility minimums (Required)
### 2.1 Keyboard focus visible
- All interactive elements must show a visible focus indicator when navigated via keyboard.
- Do not remove focus outlines unless replaced with an equivalent visible focus style.

### 2.2 Icon only buttons require aria-label
- Any button that only renders an icon must have aria-label.
- Tooltip does NOT replace aria-label.

Checklist for icon only controls:
- aria-label present
- focus visible
- type="button" where applicable

## 3) Architecture enforcement (Locked rules)
### 3.1 No direct fetch in components
- Components must never call fetch directly.
- All server calls must go through:
  - src/lib/api/client.ts (apiClient)
  - module api.ts wrappers

### 3.2 No business logic in route files
Files under:
- src/app/(app)/...

Must:
- Only compose module UI
- No parsing logic
- No API calls
- No business rules

### 3.3 Parsing and validation rules
For server responses:
Backend JSON
→ apiClient.get()
→ parseOrThrow(schema)
→ if invalid throw ApiError
→ FkError renders friendly UI

We never trust backend responses blindly.

### 3.4 No server data in Zustand (Locked)
Zustand is only for:
- workspace selection
- UI state

Zustand must never store:
- dashboard data
- orders
- inventory
- finance data
- planning outputs
- server fetched arrays or objects

Server data belongs only in React Query.

## 4) UI pattern guardrails (No duplication)
### 4.1 No duplication of table, filter, card patterns
- If a table pattern already exists, reuse it.
- If a filter toolbar pattern exists, reuse it.
- If a card layout pattern exists, reuse it.

Do not clone patterns page by page.

If you need a new pattern:
- Create it once in the correct shared location (only when explicitly approved).
- Then reuse everywhere.

## 5) PR style checklist (Use this before calling any page done)
For the page you worked on, confirm:

- [ ] Loading state exists and is reachable
- [ ] Empty state exists and is reachable
- [ ] Error state exists and is reachable and uses FkError
- [ ] Keyboard focus is visible on all interactive elements
- [ ] Icon only buttons have aria-label
- [ ] No direct fetch in any component
- [ ] Route file has no business logic and no API calls
- [ ] No duplicated table/filter/card patterns introduced
- [ ] Query keys include workspaceId where applicable