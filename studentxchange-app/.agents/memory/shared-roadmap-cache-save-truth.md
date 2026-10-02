---
name: Shared roadmap cache save truth
description: Why cached Career Compass roadmaps must be saved for each requesting student before reporting success
---

A shared generated-roadmap cache answers a content-generation question, not a per-student persistence question. A cache hit must still save the plan under the authenticated student's own track and academic year, and a generated plan must not enter the cache before its durable save succeeds.

**Why:** The institutional client reloads year-specific progress from the student's own record. A cached response can render immediately yet disappear on reload if the cached plan was never restored to that student, especially when another academic year was saved previously. Save failures must preserve the visible result without claiming it was saved.

**How to apply:** On every generated or cached Career Compass return path, distinguish roadmap availability from confirmed student persistence; return an explicit truthful saved state, retain an unsaved result for retry, and never let a shared cache substitute for a user-scoped save.