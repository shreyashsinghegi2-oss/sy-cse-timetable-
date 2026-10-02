---
name: StudentLancing AI provider boundary
description: Which parts of the combined StudentLancing and Career Compass experience are expected to avoid Claude.
---

StudentLancing's zero-Claude objective covers opportunity feeds, search, resume matching, and its adjacent coding coach, placement learning path, placement-cell question generation, and assessment parsing/grading. The standalone Career Compass roadmap is a separate AI path and may still use Claude as an intentionally targeted escalation.

**Why:** The request asked for zero Claude usage in StudentLancing without removing Claude from Career Compass. Several adjacent features appeared under StudentLancing screens even though their API routes did not have “lancing” in the name; limiting the provider change to the matcher would have left active StudentLancing Claude calls.

**How to apply:** When adding or auditing a StudentLancing-facing AI feature, trace the UI to its server endpoint before selecting a provider. Preserve the separate Career Compass behavior unless the user explicitly changes that goal.