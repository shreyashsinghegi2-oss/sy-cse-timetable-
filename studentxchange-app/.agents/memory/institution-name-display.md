---
name: Institution name display
description: Why the legacy campus label must be hidden in UI without changing institutional identity data.
---

Do not show “Veloces Campus” in student- or admin-facing copy, even when it comes from a saved institutional profile. Show a neutral “Your Institution” label instead. Keep unrelated university names visible.

**Why:** The user explicitly asked that this legacy name not appear in the Career Compass banner or elsewhere. The persisted institution name also functions as an identity and lookup namespace for institutional/SPCR records; changing it in storage would disrupt those references.

**How to apply:** Apply display-only substitutions to profile fields, roadmaps, institutional banners, and exported presentation text; never replace the underlying value used in Firestore paths, search filters, submissions, or eligibility checks.