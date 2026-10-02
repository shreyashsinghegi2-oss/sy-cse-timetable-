---
name: Admin tester bypass
description: How platform-admin testing bypass works across Placement Readiness / Coding Arena / Career Compass premium.
---

The platform admin email (PLATFORM_ADMIN_EMAIL) has a testing bypass:
- Server: readiness-score endpoint returns `eligible: true` for the admin regardless of score (breakdown stays honest); premium is already auto-granted to admin in getSubscriptionStatus.
- Client: Placement Readiness shows an admin-only "Admin Tester Mode" card (skip setup → guide or Coding Arena directly, local-only defaults, no save-profile call) and an admin-only "Change degree" button in guide phase to hop back to setup and switch tracks.
- Career Compass: the admin may repeatedly generate fresh roadmaps without daily quota/cache reuse, while concurrency and provider circuit-breaker protections remain active. A verification action returns to editable selections.

**Why:** user wants to freely test all degree tracks and the Coding Arena without earning readiness/premium.
**How to apply:** any new gate (premium, readiness, phase setup, or test-generation quota) should honor the same admin-email bypass, decided server-side where authoritative. Never bypass concurrency or provider-health protection.
