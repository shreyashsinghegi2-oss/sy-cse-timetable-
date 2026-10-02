---
name: Career Compass Claude-token objective
description: The project's AI optimization goal and quality tradeoff for future Career Compass changes
---

The user's primary Career Compass optimization metric is Claude token usage, not total tokens across providers. Keep Gemini as generator, critic, and repair engine; reserve Claude for materially risky decisions with a compact packet of flagged sections. Do not weaken roadmap quality merely to save Gemini tokens.

**Why:** A full-roadmap Claude review still consumed substantial Claude input despite Gemini generating the roadmap. Moving ordinary checks and repairs to Gemini and sending only relevant context to Claude reduces the constrained provider's usage while preserving escalation for material risk.

**How to apply:** Evaluate proposed AI changes against Claude call frequency, input/output tokens, and quality failures. Avoid routine full-roadmap Claude review; use measured per-provider telemetry before claiming a percentage saving or changing production rollout.