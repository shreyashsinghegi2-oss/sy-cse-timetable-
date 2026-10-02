import { test } from "node:test";
import assert from "node:assert/strict";
import { generateHybridRoadmap, CareerHybridError } from "./career-hybrid";

function validRoadmap() {
  return {
    years: Array.from({ length: 4 }, (_, i) => ({
      year_number: i + 1, label: `Year ${i + 1}`, targets: [`Build year ${i + 1} experience`],
      studentlancing_fit: { type: "Internship", description: "Gain experience" },
      skills: Array.from({ length: 3 }, (_, j) => ({
        name: `Skill ${i}-${j}`,
        why_it_matters: "Career relevance",
        learning_resources: [
          { url: "https://nptel.ac.in/courses", title: "NPTEL", type: "NPTEL" },
          { url: "https://www.coursera.org/", title: "Coursera", type: "Platform" },
        ],
      })),
    })),
    overall_summary: "A four-year progression",
    top_3_immediate_actions: ["One", "Two", "Three"],
    career_map: { primary_path: "Software development", next_12_months: [], next_24_months: [] },
    project_suggestions: Array.from({ length: 4 }, (_, i) => ({
      project_title: `Project ${i}`, relevance: "Software", estimated_duration: "1 month",
      tools_required: ["Git"], learning_outcomes: ["Engineering"],
    })),
  };
}

const context = {
  track: "personal", degree: "B.Tech Computer Science", year: 1,
  goals: ["Software Engineer"], field: "Software", institution: "University",
  commitment: "10 hours",
};

function options(overrides: Record<string, any> = {}): any {
  return {
    context, systemPrompt: "Return JSON",
    sanitize: (r: any) => r,
    validate: () => null,
    extractJson: (s: string) => s,
    getClaudeClient: () => { throw new Error("Claude unavailable"); },
    generateGemini: async ({ operation }: any) => ({
      text: JSON.stringify(operation === "critique" ? { risk_score: 0, issues: [] }
        : operation === "repair" ? { patches: [] } : validRoadmap()),
    }),
    ...overrides,
  };
}

test("low-risk valid Gemini output does not call Claude", async () => {
  const old = process.env.CLAUDE_REVIEW_MODE;
  process.env.CLAUDE_REVIEW_MODE = "adaptive";
  try {
    const calls: string[] = [];
    const result = await generateHybridRoadmap(options({
      generateGemini: async ({ operation }: any) => {
        calls.push(operation);
        return { text: JSON.stringify(operation === "critique" ? { risk_score: 0, issues: [] } : validRoadmap()) };
      },
    }));
    assert.equal(result.provider, "gemini");
    assert.equal(result.reviewed, false);
    assert.equal(result.roadmap.years.length, 4);
    assert.deepEqual(calls, ["generate", "critique"]);
  } finally { if (old === undefined) delete process.env.CLAUDE_REVIEW_MODE; else process.env.CLAUDE_REVIEW_MODE = old; }
});

test("custom goal triggers bounded Claude review and narrow correction", async () => {
  const reviews: any[] = [];
  const result = await generateHybridRoadmap(options({
    context: { ...context, customGoal: true },
    generateGemini: async ({ operation }: any) => ({
      text: JSON.stringify(operation === "critique" ? {
        risk_score: 72, issues: [{ path: "years[0].skills[0].why_it_matters", severity: "high", reason: "Career rationale may be wrong" }],
      } : operation === "repair" ? { patches: [] } : validRoadmap()),
    }),
    getClaudeClient: () => ({ messages: { create: async (request: any) => {
      reviews.push(request);
      return { content: [{ type: "text", text: JSON.stringify({
        decision: "REVISE",
        corrections: [{ path: "years[0].skills[0].why_it_matters", value: "Strong fit for the goal" }],
      }) }], usage: { input_tokens: 20, output_tokens: 10 } };
    } } }),
  }));
  assert.equal(reviews.length, 1);
  assert.equal(result.reviewed, true);
  assert.equal(result.roadmap.years[0].skills[0].why_it_matters, "Strong fit for the goal");
  const packet = JSON.parse(reviews[0].messages[0].content);
  assert.ok(packet.sections.length <= 4);
  assert.equal(packet.roadmap, undefined);
  assert.ok(!reviews[0].messages[0].content.includes("learning_resources"));
});

test("incomplete Gemini candidates retry and use one Claude fallback", async () => {
  let geminiCalls = 0;
  let claudeCalls = 0;
  const result = await generateHybridRoadmap(options({
    generateGemini: async ({ operation }: any) => {
      assert.equal(operation, "generate");
      geminiCalls++;
      return { text: JSON.stringify({ years: [] }) };
    },
    getClaudeClient: () => ({ messages: { create: async () => {
      claudeCalls++;
      return { content: [{ type: "text", text: JSON.stringify(validRoadmap()) }] };
    } } }),
  }));
  assert.equal(geminiCalls, 2);
  assert.equal(claudeCalls, 1);
  assert.equal(result.fallback, true);
});

test("a high-risk roadmap does not bypass an unavailable reviewer", async () => {
  await assert.rejects(
    generateHybridRoadmap(options({
      context: { ...context, customGoal: true },
      generateGemini: async ({ operation }: any) => ({
        text: JSON.stringify(operation === "critique" ? { risk_score: 75, issues: [] } : validRoadmap()),
      }),
    })),
    (err: any) => err instanceof CareerHybridError && err.code === "CLAUDE_REVIEW_UNAVAILABLE",
  );
});

test("unsafe reviewer paths are rejected and never alter a valid roadmap", async () => {
  let calls = 0;
  await assert.rejects(generateHybridRoadmap(options({
    context: { ...context, customGoal: true },
    generateGemini: async ({ operation }: any) => ({
      text: JSON.stringify(operation === "critique" ? { risk_score: 75, issues: [] } : validRoadmap()),
    }),
    getClaudeClient: () => ({ messages: { create: async () => {
      calls++;
      return { content: [{ type: "text", text: '{"decision":"REVISE","corrections":[{"path":"__proto__.polluted","value":"bad"}]}' }] };
    } } }),
  })), (err: any) => err instanceof CareerHybridError && err.code === "CLAUDE_REVIEW_FAILED");
  assert.equal(calls, 1);
  assert.equal(({} as any).polluted, undefined);
});

test("malformed JSON is retried once without calling Claude when repair succeeds", async () => {
  let calls = 0;
  const result = await generateHybridRoadmap(options({
    generateGemini: async ({ operation }: any) => ({
      text: operation === "critique" ? '{"risk_score":0,"issues":[]}'
        : ++calls === 1 ? '{"years":' : JSON.stringify(validRoadmap()),
    }),
  }));
  assert.equal(calls, 2);
  assert.equal(result.provider, "gemini");
});

test("Claude REGENERATE retries Gemini instead of calling Claude full-generation fallback", async () => {
  let geminiCalls = 0;
  let claudeCalls = 0;
  const result = await generateHybridRoadmap(options({
    context: { ...context, customGoal: true },
    generateGemini: async ({ operation }: any) => {
      if (operation === "generate") geminiCalls++;
      return { text: JSON.stringify(operation === "critique" ? { risk_score: 70, issues: [] } : validRoadmap()) };
    },
    getClaudeClient: () => ({ messages: { create: async () => ({
      content: [{ type: "text", text: ++claudeCalls === 1
        ? '{"decision":"REGENERATE","issues":["material mismatch"],"corrections":[]}'
        : '{"decision":"APPROVE","issues":[],"patches":[]}' }],
    }) } }),
  }));
  assert.equal(geminiCalls, 2);
  assert.equal(claudeCalls, 2);
  assert.equal(result.fallback, false);
  assert.equal(result.reviewed, true);
});

test("a routine quality warning stays with Gemini rather than defaulting to Claude", async () => {
  let repaired = 0;
  const weak = validRoadmap();
  weak.years[1].targets = weak.years[0].targets;
  const result = await generateHybridRoadmap(options({
    generateGemini: async ({ operation }: any) => {
      if (operation === "repair") { repaired++; return { text: '{"patches":[]}' }; }
      return { text: JSON.stringify(operation === "critique" ? { risk_score: 10, issues: [] } : weak) };
    },
  }));
  assert.equal(repaired, 1);
  assert.equal(result.reviewed, false);
});

test("Gemini can repair a flagged section and verify it without Claude", async () => {
  const calls: string[] = [];
  const result = await generateHybridRoadmap(options({
    generateGemini: async ({ operation, roadmap }: any) => {
      calls.push(operation);
      if (operation === "critique") return { text: JSON.stringify({
        risk_score: roadmap.years[0].skills[0].name === "Skill 0-0" ? 70 : 0,
        issues: roadmap.years[0].skills[0].name === "Skill 0-0"
          ? [{ path: "years[0].skills[0].name", severity: "high", reason: "Too generic" }] : [],
      }) };
      if (operation === "repair") return { text: '{"patches":[{"path":"years[0].skills[0].name","value":"SQL Analysis"}]}' };
      return { text: JSON.stringify(validRoadmap()) };
    },
  }));
  assert.deepEqual(calls, ["generate", "critique", "repair", "critique"]);
  assert.equal(result.roadmap.years[0].skills[0].name, "SQL Analysis");
  assert.equal(result.reviewed, false);
});

test("a custom goal without a material Gemini concern stays Gemini-only", async () => {
  const result = await generateHybridRoadmap(options({ context: { ...context, customGoal: true } }));
  assert.equal(result.provider, "gemini");
  assert.equal(result.reviewed, false);
});

test("unrelated career goals escalate only when Gemini finds material risk", async () => {
  const reviews: any[] = [];
  const result = await generateHybridRoadmap(options({
    context: { ...context, goals: ["Software Engineer", "Clinical Researcher"] },
    generateGemini: async ({ operation }: any) => ({
      text: JSON.stringify(operation === "critique" ? {
        risk_score: 85,
        issues: [{ path: "career_map.primary_path", severity: "critical", reason: "Incompatible career directions" }],
      } : validRoadmap()),
    }),
    getClaudeClient: () => ({ messages: { create: async (request: any) => {
      reviews.push(request);
      return { content: [{ type: "text", text: '{"decision":"APPROVE","issues":[],"patches":[]}' }] };
    } } }),
  }));
  assert.equal(result.reviewed, true);
  assert.equal(reviews.length, 1);
  assert.deepEqual(JSON.parse(reviews[0].messages[0].content).sections.map((s: any) => s.path), ["career_map.primary_path"]);
});

test("an unresolved high-severity issue escalates even if Gemini reports a low score", async () => {
  let reviews = 0;
  const result = await generateHybridRoadmap(options({
    generateGemini: async ({ operation }: any) => ({
      text: JSON.stringify(operation === "critique" ? {
        risk_score: 12, issues: [{ path: "years[0].skills[0].name", severity: "high", reason: "Wrong profession" }],
      } : operation === "repair" ? { patches: [] } : validRoadmap()),
    }),
    getClaudeClient: () => ({ messages: { create: async () => {
      reviews++;
      return { content: [{ type: "text", text: '{"decision":"APPROVE","issues":[],"patches":[]}' }] };
    } } }),
  }));
  assert.equal(reviews, 1);
  assert.equal(result.reviewed, true);
});

test("unsupported critical issue fails before sending an irrelevant packet to Claude", async () => {
  let reviews = 0;
  await assert.rejects(generateHybridRoadmap(options({
    generateGemini: async ({ operation }: any) => ({
      text: JSON.stringify(operation === "critique" ? {
        risk_score: 90, issues: [{ path: "years[0].skills[0].learning_resources[0].url", severity: "critical", reason: "Unsafe link" }],
      } : validRoadmap()),
    }),
    getClaudeClient: () => ({ messages: { create: async () => { reviews++; return {}; } } }),
  })), (error: any) => error.code === "CLAUDE_PACKET_UNSAFE");
  assert.equal(reviews, 0);
});

test("an invalid Claude patch cannot trigger full Claude fallback", async () => {
  let claudeCalls = 0;
  await assert.rejects(generateHybridRoadmap(options({
    context: { ...context, requireReview: true },
    validate: (r: any) => r.years[0].skills[0].name === "BAD" ? "invalid patch" : null,
    getClaudeClient: () => ({ messages: { create: async () => {
      claudeCalls++;
      return { content: [{ type: "text", text: '{"decision":"REVISE","patches":[{"path":"years[0].skills[0].name","action":"replace","value":"BAD"}]}' }] };
    } } }),
  })), (error: any) => error.code === "CLAUDE_REVIEW_FAILED");
  assert.equal(claudeCalls, 1);
});

test("configured Claude reviewer limit above the cap is clamped to 400 tokens", async () => {
  const old = process.env.CLAUDE_REVIEW_MAX_TOKENS;
  process.env.CLAUDE_REVIEW_MAX_TOKENS = "4000";
  try {
    let limit = 0;
    await generateHybridRoadmap(options({
      context: { ...context, requireReview: true },
      getClaudeClient: () => ({ messages: { create: async (request: any) => {
        limit = request.max_tokens;
        return { content: [{ type: "text", text: '{"decision":"APPROVE","issues":[],"patches":[]}' }] };
      } } }),
    }));
    assert.equal(limit, 400);
  } finally {
    if (old === undefined) delete process.env.CLAUDE_REVIEW_MAX_TOKENS;
    else process.env.CLAUDE_REVIEW_MAX_TOKENS = old;
  }
});

test("Claude reviewer defaults to 400 tokens", async () => {
  const old = process.env.CLAUDE_REVIEW_MAX_TOKENS;
  delete process.env.CLAUDE_REVIEW_MAX_TOKENS;
  try {
    let limit = 0;
    await generateHybridRoadmap(options({
      context: { ...context, requireReview: true },
      getClaudeClient: () => ({ messages: { create: async (request: any) => {
        limit = request.max_tokens;
        return { content: [{ type: "text", text: '{"decision":"APPROVE","issues":[],"patches":[]}' }] };
      } } }),
    }));
    assert.equal(limit, 400);
  } finally {
    if (old !== undefined) process.env.CLAUDE_REVIEW_MAX_TOKENS = old;
  }
});

test("invalid Gemini critique fails closed without spending Claude tokens", async () => {
  await assert.rejects(generateHybridRoadmap(options({
    generateGemini: async ({ operation }: any) => ({
      text: JSON.stringify(operation === "critique" ? { issues: [] } : validRoadmap()),
    }),
  })), (error: any) => error.code === "GEMINI_CRITIQUE_FAILED");
});

test("missing Gemini key fails explicitly rather than silently switching engines", async () => {
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const { generateGemini, ...withoutTestProvider } = options();
    await assert.rejects(
      generateHybridRoadmap(withoutTestProvider),
      (err: any) => err instanceof CareerHybridError && err.code === "GEMINI_NOT_CONFIGURED",
    );
  } finally { if (old !== undefined) process.env.GEMINI_API_KEY = old; }
});