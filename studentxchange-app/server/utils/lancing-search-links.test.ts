import assert from "node:assert/strict";
import test from "node:test";
import { __testing, getLancingSearchLinks } from "./lancing-search-links";

const categories = ["jobs", "internships", "micro_tasks", "competitions", "ai_match"] as const;

test("explicit Gemini deadline respects the provider minimum", () => {
  assert.ok(__testing.REQUEST_TIMEOUT_MS >= 10_000);
});

test("deterministic fallback provides category-specific Google search links for all supported categories", async () => {
  for (const category of categories) {
    const result = await getLancingSearchLinks(
      { category, query: `unique-${category}-test` },
      { engine: "legacy" },
    );
    assert.equal(result.engineStatus, "fallback");
    assert.equal(result.cached, false);
    assert.equal(result.links.length, 4);
    for (const link of result.links) {
      assert.match(link.title, /^Search: /);
      const url = new URL(link.url);
      assert.equal(url.origin, "https://www.google.com");
      assert.equal(url.pathname, "/search");
      assert.ok(url.searchParams.get("q"));
      assert.match(url.searchParams.get("q")!, new RegExp(category === "ai_match" ? "student|career|jobs|internships|opportunities" : category.replace("_", "[ -]"), "i"));
    }
  }
});

test("search URL parameters encode server-built phrases and never use supplied URLs", async () => {
  const result = await getLancingSearchLinks(
    { category: "jobs", query: "https://evil.example/path?secret=1" },
    { engine: "legacy" },
  );
  for (const link of result.links) {
    assert.equal(new URL(link.url).origin, "https://www.google.com");
    assert.doesNotMatch(link.title, /evil\.example|https?:\/\//i);
  }
  assert.equal(__testing.buildLinks(["student jobs C++"])[0].url, "https://www.google.com/search?q=student+jobs+C%2B%2B");
});

test("input normalization bounds query and hints and rejects invalid categories", () => {
  const normalized = __testing.normalizeInput({
    category: "internships",
    query: ` ${"student ".repeat(30)} https://ignored.example/path `,
    hints: ["python", "remote", "design", "research", "summer", "extra"],
  });
  assert.ok(normalized.query.length <= 120);
  assert.equal(normalized.hints.length, 5);
  assert.ok(normalized.hints.every((hint) => hint.length <= 40));
  assert.throws(() => __testing.normalizeInput({ category: "all" }), /Invalid category/);
});

test("contact details in query and hints are redacted before Gemini and generated search URLs", async () => {
  const phone = "+1 (415) 555-0136";
  const email = "student.contact@example.com";
  let request: Record<string, any> | undefined;
  const result = await getLancingSearchLinks(
    {
      category: "jobs",
      query: `remote developer ${phone} ${email}`,
      hints: [`call 415-555-0136 or email ${email}`],
    },
    {
      engine: "gemini",
      apiKey: "test-key",
      generate: async (input) => {
        request = input;
        return { text: JSON.stringify({ phrases: ["remote student jobs", "entry level software jobs"] }) };
      },
    },
  );
  const prompt = String(request?.contents || "");
  const output = JSON.stringify(result.links);
  assert.doesNotMatch(prompt, /415|555|0136|student\.contact|example\.com/i);
  assert.doesNotMatch(output, /415|555|0136|student\.contact|example\.com/i);
});

test("Gemini suggestions are deduplicated, validated as phrases, and links remain Google searches", async () => {
  let calls = 0;
  let request: Record<string, any> | undefined;
  const result = await getLancingSearchLinks(
    { category: "jobs", query: "gemini-injected-test" },
    {
      engine: "gemini",
      apiKey: "test-key",
      generate: async (input) => {
        calls += 1;
        request = input;
        return {
          text: JSON.stringify({
            phrases: [
              "remote student jobs",
              "Remote student jobs",
              "https://attacker.example/jobs",
              "apply now job listing",
              "entry level software jobs",
            ],
          }),
        };
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(request?.config?.maxOutputTokens, 1024);
  assert.equal(result.engineStatus, "gemini");
  assert.equal(result.links.length, 4);
  assert.equal(new Set(result.links.map((link) => link.title.toLowerCase())).size, 4);
  assert.ok(result.links.every((link) => new URL(link.url).origin === "https://www.google.com"));
  assert.ok(result.links.every((link) => link.title.startsWith("Search: ")));
});

test("concurrent identical cache misses share one Gemini call", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const input = { category: "internships", query: "coalesced-provider-request-unique" };
  const dependencies = {
    engine: "gemini" as const,
    apiKey: "test-key",
    generate: async () => {
      calls += 1;
      await gate;
      return { text: JSON.stringify({ phrases: ["student internships", "remote internships"] }) };
    },
  };
  const firstRequest = getLancingSearchLinks(input, dependencies);
  const secondRequest = getLancingSearchLinks(input, dependencies);
  release();
  const [first, second] = await Promise.all([firstRequest, secondRequest]);
  assert.equal(calls, 1);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.deepEqual(first.links, second.links);
});

test("missing or failed Gemini provider uses deterministic fallback without exposing provider errors", async () => {
  const missingKey = await getLancingSearchLinks(
    { category: "competitions", query: "fallback-without-key" },
    { engine: "gemini", apiKey: "" },
  );
  assert.equal(missingKey.engineStatus, "fallback");
  const failed = await getLancingSearchLinks(
    { category: "micro_tasks", query: "fallback-provider-error" },
    {
      engine: "gemini",
      apiKey: "test-key",
      generate: async () => { throw new Error("private provider detail"); },
    },
  );
  assert.equal(failed.engineStatus, "fallback");
  assert.equal(failed.links.length, 4);
  assert.doesNotMatch(JSON.stringify(failed), /private provider detail|test-key/);
});

test("malformed and duplicate Gemini phrases are not trusted as URLs", () => {
  const phrases = __testing.validatePhrases([
    "Student internship opportunities",
    " student internship opportunities ",
    "https://example.org/internships",
    "Apply here for internship",
    "Remote internships for students",
  ], "internships");
  assert.deepEqual(phrases, ["Student internship opportunities", "Remote internships for students"]);
});

test("invalid configured engine fails closed", async () => {
  const previous = process.env.STUDENTLANCING_AI_ENGINE;
  process.env.STUDENTLANCING_AI_ENGINE = "claude";
  try {
    await assert.rejects(
      getLancingSearchLinks({ category: "jobs", query: "invalid-engine-test" }),
      /Invalid STUDENTLANCING_AI_ENGINE/,
    );
  } finally {
    if (previous === undefined) delete process.env.STUDENTLANCING_AI_ENGINE;
    else process.env.STUDENTLANCING_AI_ENGINE = previous;
  }
});