---
name: Gemini model availability
description: Provider model availability findings for Career Compass's server-side Gemini generation
---

Do not assume a once-documented Flash-Lite model ID works with this project's key. On 2026-09-30, a minimal JSON-mode probe returned 404 for `gemini-2.5-flash-lite` (unavailable to new users) and 503 for `gemini-3.1-flash-lite` (temporary high demand); `gemini-3.5-flash-lite` returned valid JSON. Model IDs must remain configurable.

**Why:** A credential can be valid while a specific model is unavailable. Treating a model error as a bad key would send users through an unnecessary secret-rotation loop, and treating a single temporary 503 as permanent would be premature.

**How to apply:** Before changing production's model or enabling hybrid traffic, run a tiny server-only JSON-mode probe with the configured key, then a synthetic full roadmap. Never print or put the key in code or chat.