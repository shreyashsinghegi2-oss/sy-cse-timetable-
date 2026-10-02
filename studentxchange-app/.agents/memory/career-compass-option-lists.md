---
name: Career Compass degree/aspiration option lists
description: Single source of truth for Career Compass degrees + aspirations, and why degree labels must never be renamed.
---

# Career Compass option lists

Degree groups, flat degree list (`CAREER_DEGREES`), years, and aspirations (grouped + flat) live in ONE shared module so the personal flow, institutional student view, and admin Roadmap Manager all stay in sync. `client/src/config/constants.ts` re-exports the degree/year sets for legacy import paths; the page imports the grouped sets directly.

## Rule: never rename or delete an existing degree label — only add new ones.
**Why:** A degree string is slugified by `degreeKey()` (in `shared/career-keys.ts`) into the Firestore document id used by `instRoadmapDocId()` for `institutionalRoadmaps`. Renaming a label changes its key, so any already-published institutional roadmap (and any saved student profile that stored the old label) silently orphans — the student would no longer resolve their published roadmap, and their saved degree would no longer show as selected in the dropdown.
**How to apply:** When expanding the catalog, append new labels; keep all prior labels verbatim. Keep labels distinct within the first ~60 chars of their slug (degreeKey truncates at 60) to avoid doc-id collisions — verify with a quick uniqueness pass over the flat list after edits.

## Rule: career-goal IDs are stable; prior labels must remain resolvable aliases.
**Why:** Saved profiles still contain human-readable labels, while AI cache identity and roadmap meaning now depend on canonical goal IDs plus a taxonomy version. Dropping an old label would strand saved selections; reusing an ID for a different role could serve a semantically wrong roadmap.
**How to apply:** Add roles with new IDs, keep the legacy-label regression contract passing, represent renames as aliases, and bump the taxonomy version whenever mapping semantics change. Keep the selector derived from the shared taxonomy rather than hardcoding UI options.
