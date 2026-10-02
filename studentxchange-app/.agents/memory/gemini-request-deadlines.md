---
name: Gemini request deadlines
description: A provider-side minimum for manually specified request timeouts
---

When setting an explicit deadline on a Gemini SDK request, keep it at or above ten seconds. A shorter deadline is rejected immediately with HTTP 400 (`INVALID_ARGUMENT`), not treated as a short timeout.

**Why:** A new low-latency search-suggestion request used an eight-second SDK timeout and always fell back despite a working key and model; the provider rejected the deadline before generation began.

**How to apply:** For new Gemini calls, choose a deadline of at least ten seconds (and enough time for the model), use a bounded fallback if it times out, and classify immediate HTTP 400 separately from availability or credential errors.