import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAIMatchFallback,
  getAIMatches,
  getLancingAIEngine,
  getLiveFeed,
  rankLancingOpportunities,
  searchOpportunities,
  validateLancingRankingResponse,
} from "./lancing-ai";

function withEnvironment<T>(values: Record<string, string | undefined>, callback: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return callback().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

const internalCandidate = {
  id: "internal-record-27",
  title: "React internship",
  company: "Internal employer",
  source: "Internal",
  url: "https://example.test/record/27",
  stipend: "Not specified",
  work_mode: "Remote",
  skills: ["React"],
  posted_at: new Date().toISOString(),
};

test("AI Match fallback never returns fabricated listings", () => {
  assert.deepEqual(buildAIMatchFallback({ skills: ["React"] }), []);
});

test("unknown engine configuration fails closed and an unset engine defaults to Gemini", async () => {
  await withEnvironment({ STUDENTLANCING_AI_ENGINE: undefined }, async () => {
    assert.equal(getLancingAIEngine(), "gemini");
  });
  await withEnvironment({ STUDENTLANCING_AI_ENGINE: "claude" }, async () => {
    assert.throws(() => getLancingAIEngine(), /Invalid STUDENTLANCING_AI_ENGINE/);
    await assert.rejects(
      rankLancingOpportunities([internalCandidate], {}, "React", "test"),
      /Invalid STUDENTLANCING_AI_ENGINE/,
    );
  });
});

test("legacy mode deterministically ranks only supplied records without calling Gemini", async () => {
  await withEnvironment({ STUDENTLANCING_AI_ENGINE: "legacy", GEMINI_API_KEY: undefined }, async () => {
    const output = await rankLancingOpportunities([
      { ...internalCandidate, id: "real-react", title: "React developer internship" },
      { ...internalCandidate, id: "real-design", title: "Graphic design placement", skills: ["Illustrator"] },
    ], { skills: ["React"] }, "React internship", "test");
    assert.deepEqual(output.map((item) => item.id), ["real-react", "real-design"]);
    assert.equal(output[0].engineStatus, "legacy");
    assert.equal(output[0].fallback, false);
  });
});

test("Gemini provider failures degrade to deterministic results with only real supplied IDs", async () => {
  await withEnvironment({ STUDENTLANCING_AI_ENGINE: "gemini", GEMINI_API_KEY: undefined }, async () => {
    const output = await rankLancingOpportunities([internalCandidate], { skills: ["React"] }, "React internship", "test");
    assert.deepEqual(output.map((item) => item.id), ["internal-record-27"]);
    assert.equal(output[0].fallback, true);
    assert.equal(output[0].engineStatus, "degraded");
  });
});

test("search intent and ranking failures keep the query and return supplied source-backed items", async () => {
  await withEnvironment({ STUDENTLANCING_AI_ENGINE: "gemini", GEMINI_API_KEY: undefined }, async () => {
    const result = await searchOpportunities("React internship", "micro_tasks", [internalCandidate]);
    assert.deepEqual(result.items.map((item) => item.id), ["internal-record-27"]);
    assert.equal(result.items[0].fallback, true);
    assert.equal(result.items[0].engineStatus, "degraded");
  });
});

test("resume skills and role evidence change local ranking order in legacy and Gemini fallback", async () => {
  const candidates = [
    { ...internalCandidate, id: "react-role", title: "Frontend React Developer", skills: ["React", "TypeScript"] },
    { ...internalCandidate, id: "python-role", title: "Python Data Analyst", skills: ["Python", "SQL"] },
  ];
  for (const engine of ["legacy", "gemini"] as const) {
    await withEnvironment({ STUDENTLANCING_AI_ENGINE: engine, GEMINI_API_KEY: undefined }, async () => {
      const profile = { skills: [] as string[] };
      const react = await getAIMatches({
        resumeText: "Frontend developer experienced with React and TypeScript.",
        profile,
        candidates,
      });
      const python = await getAIMatches({
        resumeText: "Python data analyst with SQL experience.",
        profile,
        candidates,
      });
      assert.equal(react[0].id, "react-role");
      assert.equal(python[0].id, "python-role");
      const ranked = [...react, ...python];
      const ids = new Set(ranked.map((item) => item.id));
      assert.ok(ids.has("react-role") && ids.has("python-role"));
      // The source-backed feed may now contain real external records. Only
      // supplied candidates or independently verified stored sources belong here.
      for (const item of ranked) {
        if (item.id === "react-role" || item.id === "python-role") continue;
        assert.equal(item.source_metadata?.verified, true);
      }
      if (engine === "legacy") assert.equal(react[0].engineStatus, "legacy");
      else {
        assert.equal(react[0].fallback, true);
        assert.equal(react[0].engineStatus, "degraded");
      }
    });
  }
});

test("AI matching filters stale and undated listings before ranking but keeps verified competitions", async () => {
  const recent = new Date().toISOString();
  const stale = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  const candidates = [
    { ...internalCandidate, id: "current-job", posted_at: recent },
    { ...internalCandidate, id: "stale-job", posted_at: stale },
    { ...internalCandidate, id: "undated-internship", posted_at: undefined, category: "internship" },
    {
      ...internalCandidate,
      id: "stale-verified-competition",
      posted_at: stale,
      source_metadata: { verified: true, verificationStatus: "VERIFIED_EXTERNAL", category: "competitions" },
    },
    {
      ...internalCandidate,
      id: "undated-verified-competition",
      posted_at: undefined,
      source_metadata: { verified: true, verificationStatus: "VERIFIED_EXTERNAL", category: "competitions" },
    },
  ];

  await withEnvironment({ STUDENTLANCING_AI_ENGINE: "gemini", GEMINI_API_KEY: undefined }, async () => {
    const output = await getAIMatches({
      resumeText: "React developer with experience building web applications.",
      profile: { skills: ["React"] },
      candidates,
    });
    const ids = new Set(output.map((item) => item.id));
    assert.ok(ids.has("current-job"));
    assert.ok(ids.has("stale-verified-competition"));
    assert.ok(ids.has("undated-verified-competition"));
    assert.ok(!ids.has("stale-job"));
    assert.ok(!ids.has("undated-internship"));
    assert.equal(output.find((item) => item.id === "current-job")?.engineStatus, "degraded");
  });
});

test("AI matching cannot override explicit degree eligibility for verified competitions", async () => {
  const restricted = {
    ...internalCandidate,
    id: "postgraduate-only-event",
    type: "hackathon",
    eligibility: "Only postgraduate students may participate",
    source_metadata: { verified: true, verificationStatus: "VERIFIED_EXTERNAL", category: "competitions" },
  };
  await withEnvironment({ STUDENTLANCING_AI_ENGINE: "legacy" }, async () => {
    const undergraduate = await getAIMatches({
      resumeText: "", profile: { skills: [], degree: "B.Tech" }, candidates: [restricted],
    });
    assert.ok(!undergraduate.some((item) => item.id === restricted.id));
    const postgraduate = await getAIMatches({
      resumeText: "", profile: { skills: [], degree: "M.Tech" }, candidates: [restricted],
    });
    assert.ok(postgraduate.some((item) => item.id === restricted.id));
  });
});

test("micro-task feeds and searches return no invented external-source listings", async () => {
  await withEnvironment({ STUDENTLANCING_AI_ENGINE: "legacy" }, async () => {
    const feed = await getLiveFeed("micro_tasks");
    const search = await searchOpportunities("logo design", "micro_tasks");
    assert.deepEqual(feed.data, []);
    assert.deepEqual(search.items, []);
  });
});

test("ranking response rejects invalid JSON and a missing rankings array", () => {
  assert.throws(() => validateLancingRankingResponse("{not json"), /invalid structured JSON/i);
  assert.throws(() => validateLancingRankingResponse('{"items":[]}'), /missing the rankings array/i);
  assert.deepEqual(validateLancingRankingResponse('{"rankings":[]}'), []);
});