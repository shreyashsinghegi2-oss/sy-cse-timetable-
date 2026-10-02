---
name: Career Compass roadmap truncation
description: LLM roadmap JSON must fit max_tokens; models ignore "keep under N tokens" prose — enforce structural caps
---
Rule: Claude models ignore soft token-budget instructions ("keep response under N tokens"). For JSON-generating routes, brevity must be enforced structurally (exact item counts, per-field word caps) AND max_tokens must exceed worst-case output, or the JSON truncates mid-string and parses to null.

**Why:** Career Compass roadmap silently bounced users back to the onboarding form across 5 rounds — sonnet-4-5 hit max_tokens even at 4000 (54s, unterminated JSON). haiku-4-5 + strict structural caps finishes ~32s with stop=end_turn.

**How to apply:** Any change to Career Compass prompts/models: test with a live API call checking stop_reason=end_turn and JSON.parse success before shipping. Treat `max_tokens` as an incomplete response even if its text happens to parse; never cache it. Never let a stream route send roadmap:null silently — emit an SSE error event so the client can surface it.

**Timeout rule:** Do not apply an application-level deadline to the streamed full Career Map. Send SSE heartbeats, retry one failed/incomplete provider response transparently, and abort provider work only when the client disconnects.

**Why:** A structurally complete four-year Haiku roadmap has previously taken about 32 seconds, so fixed request deadlines rejected healthy generations and can regress again as the roadmap schema grows.
