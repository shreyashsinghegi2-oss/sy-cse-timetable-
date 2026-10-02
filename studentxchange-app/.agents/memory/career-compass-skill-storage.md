---
name: Career Compass skill-status storage shapes
description: Two different Firestore shapes store skill completion for personal vs institutional career maps; they are not interchangeable.
---
The personal Career Compass and the institutional Career Compass store per-skill completion in DIFFERENT shapes:

- **Personal**: `career_compass_profiles/{uid}` writes each ticked skill as a nested field `skills.<sanitizedName>` (name run through `replace(/[^a-z0-9]/gi,"_")`), plus a coarse `profileScore` (often a flat 20). There is NO top-level `skillStatus` map on the personal profile doc.
- **Institutional**: `users/{uid}/institutionalProgress/{degreeKey}` writes a real `skillStatus` map (skillName -> not_started|in_progress|done) plus computed `progressScore`/`completedSkills`.

**Why:** Admin "Student Progress Tracker" (server/routes/institutional-roadmap.ts) computes personal done/total from `p.skillStatus`, which does NOT exist on personal profiles, so personal done/total reads 0/0. The personal *score* column still works because it falls back to `p.profileScore`. Institutional progress is fully self-consistent.

**How to apply:** If you ever need accurate personal completed-skill counts for the admin tracker, read the `skills.*` nested map on the profile doc (not `skillStatus`). Do not assume the two tracks share a storage shape.
