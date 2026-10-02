# Career Compass AI rollout

The existing Career Compass schema, student routes, authentication, quotas, SSE final event, and institutional publishing flow are retained. The default engine is **legacy**. Set `hybrid` only in a controlled development environment for testing; keep production on legacy until authenticated save/load checks are complete.

## Configure on the server

Set the following in workspace secrets/environment settings, **not in client code**:

| Variable | Purpose |
|---|---|
| `CAREER_COMPASS_AI_ENGINE` | `legacy` (default) or `hybrid`. Set to `legacy` to roll back without changing stored roadmaps. |
| `GEMINI_API_KEY` | Required for uncached hybrid generation; use a freshly rotated key. |
| `GEMINI_MODEL` | Defaults to `gemini-3.5-flash-lite`, the Flash-Lite model verified with this project's key. Override if the available model catalog changes. |
| `CLAUDE_API_KEY` | Optional for low-risk Gemini generation; required for high-risk review and emergency fallback. Existing `ANTHROPIC_API_KEY` is accepted for backward compatibility. |
| `CLAUDE_MODEL` | Defaults to `claude-haiku-4-5` for hybrid review/fallback and comparison. Legacy generation keeps its current model. |
| `CLAUDE_REVIEW_MODE` | `adaptive` (default), `always` (quality testing), or `never` (Gemini-only testing). |
| `CLAUDE_REVIEW_PERCENT` | Optional percentage (0–100) of low-risk outputs reviewed in adaptive mode; defaults to 0. |
| `CLAUDE_REVIEW_MAX_TOKENS` | Hard upper bound for Claude's targeted reviewer output; defaults to 400 and cannot exceed 400. |
| `CAREER_COMPASS_AI_COMPARE` | `1` enables the authenticated platform-admin-only comparison endpoint; otherwise it is unavailable. Comparisons make both provider calls and incur their respective costs. |

Configure optional cost rates in USD per million tokens: `AI_TOKEN_PRICE_GEMINI_INPUT_PER_1M`, `AI_TOKEN_PRICE_GEMINI_OUTPUT_PER_1M`, `AI_TOKEN_PRICE_CLAUDE_INPUT_PER_1M`, and `AI_TOKEN_PRICE_CLAUDE_OUTPUT_PER_1M` (plus optional `AI_TOKEN_PRICE_<PROVIDER>_CACHE_INPUT_PER_1M`). Supply current prices for the actual configured models; the application does not guess when a price is missing. No database migration is necessary.

## Flow and failure behavior

For students, a published institutional roadmap is returned first. Next, the hybrid route checks a seven-day Firestore cache keyed by the authenticated student and the normalized prompt/profile context. Cache entries are only written **after** a validated roadmap is saved to the student's existing Firestore records. An uncached request must pass the existing quota/concurrency gate, then Gemini produces structured JSON. Code validates it; a second Gemini call critiques career fit and progression, and Gemini can patch and re-check a flagged descriptive field. In adaptive mode, a risk score of 60+ or a critical Gemini issue escalates to Claude; low-risk plans do not. A compact packet of at most four flagged sections is sent, never the entire roadmap or learning resources. Claude may approve, return up to five narrow text patches, or request one more Gemini generation. Claude full generation is an emergency fallback only when Gemini cannot produce a structurally valid plan in two attempts. A failed Gemini quality check fails explicitly rather than silently saving an unreviewed plan. Admin draft generation uses the same hybrid generator but deliberately does not cache or publish the draft.

The student stream still returns a final `{done:true,roadmap}` event and can return JSON for a published/cache hit. The final event also includes `saved`. Both legacy and hybrid paths now await the student save before marking a plan saved; legacy cache hits are also restored to the requesting student's own records. If a generated roadmap cannot be saved, the roadmap remains visible but the UI says **Save failed** and offers **Retry save**; it is not cached or marked saved. The old Claude path remains intact for rollback. Provider errors do not expose credentials or raw provider responses to clients.

Firestore stores cache entries in `career_compass_roadmap_cache` and anonymous provider events in `career_compass_ai_usage`. The platform admin can query `GET /api/career-compass/admin/ai-usage?days=30` for usage/cost estimates. With `CAREER_COMPASS_AI_COMPARE=1`, a platform admin can POST sample context to `/api/career-compass/admin/ai-compare` to view hybrid and Claude candidate outputs side-by-side without saving or publishing either candidate. Keep this mode disabled for normal traffic.

Usage events include Gemini `generate`, `critique`, and `repair`, Claude `review` and emergency `fallback`, and a categorical reason for escalation. The admin summary reports Claude input/output tokens and calls/tokens per completed roadmap. Optimize Claude calls, input, and output tokens—not total AI tokens. Before the reviewer output cap was reduced to 400, one synthetic MBA finance profile used 5,151 Claude tokens for a Claude-only plan, 2,985 for a full-roadmap hybrid review, and 528 for the targeted review (266 input, 262 output, in a 684-byte packet). That was about 89.7% fewer Claude tokens than the Claude-only sample, **not a production average or a measurement of the new cap**. Normal validated plans can use zero Claude tokens. Cache keys use an AI architecture version so pre-critique results are not reused.

## Verification

Run `npx tsx --test server/utils/career-hybrid.test.ts`, `npm run check`, and `npm run build`. The TypeScript check may report pre-existing `LancingUser` display-property errors in the Career Compass page; confirm that no new errors are present. To validate providers in a controlled environment: set a rotated `GEMINI_API_KEY`, set `CAREER_COMPASS_AI_ENGINE=hybrid`, generate a personal and an institutional plan using test accounts, confirm published institutional content bypasses providers, inspect save/reload and progress, test a custom Other goal with usable Claude credits, then review admin usage before increasing traffic. Restore `legacy` immediately if quality or provider availability is inadequate.

AI-generated learning links are checked for safe HTTP(S) structure, not live reachability. No request-time scraping is performed. Unknown token prices remain an explicit cost-estimate limitation.

Model availability was checked with a minimal server-side JSON request. `gemini-3.1-flash-lite` returned a temporary high-demand response, and `gemini-2.5-flash-lite` was unavailable to new users; `gemini-3.5-flash-lite` and Claude Haiku both responded. Synthetic Gemini-only and targeted-Claude-review roadmaps passed validation. These checks did not save or publish any student data. Authenticated personal/institutional save/reload, cache-hit restoration, SSE, progress tracking, and published-plan priority still need an isolated test account or environment.