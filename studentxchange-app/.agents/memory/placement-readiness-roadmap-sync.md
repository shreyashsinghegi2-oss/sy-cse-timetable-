---
name: Placement Readiness ↔ Career Roadmap sync
description: Why roadmap→placement sync passes skill NAMES only, and how institutional progress folds into the readiness score.
---

# Placement Readiness ↔ Career Roadmap sync

When a student has a filled Career Roadmap, Placement Readiness is curated from
the roadmap's skills. The sync passes **skill names only** (deduped
`roadmap.years[].skills[].name`), never credits or hours.

**Why:** credits/hours are sourced independently on each side — `getMeta` (client,
`placement-readiness.tsx`) and `lookupCredits` (server,
`server/routes/placement-readiness.ts`). Passing roadmap credit_points through would
let the displayed/earned credits diverge from the server's readiness math. `getMeta`
fuzzy-matches and falls back to `{credits:2,hours:25,category:"Applied"}`, so arbitrary
roadmap skill names render fine without a hardcoded catalog entry.

**How to apply:** keep roadmap→placement props limited to names (`roadmapSkills`,
`roadmapAspirations`). If you ever need credits to match exactly, normalize getMeta
and lookupCredits to a single shared source rather than threading roadmap credits.

## Institutional progress → readiness score
Institutional roadmap progress (0-100) is read server-side from
`users/{uid}/institutionalProgress/{degreeKey(profile.degree)}.progressScore`,
clamped to [0,100], and folded into the `portal_activity` bucket as up to +5 points
(bucket cap 25, total stays ≤100). A gap message fires when progress is >0 but <60
(0 is treated as "no institutional roadmap" and not nagged). Client surfaces this via
GET `/api/institutional-roadmap/progress?degree=` in the guide phase.
