import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  __testing,
  fetchHimalayasCategory,
  normalizeHimalayasResponse,
} from "./lancing-himalayas";

const now = new Date("2026-10-01T12:00:00.000Z");
const updatedAt = Math.floor(now.getTime() / 1000) - 60;

function apiJob(overrides: Record<string, unknown> = {}) {
  return {
    title: "Junior Software Engineer",
    companyName: "Example Labs",
    employmentType: "Full Time",
    applicationLink: "https://himalayas.app/companies/example-labs/jobs/junior-software-engineer",
    guid: "https://himalayas.app/companies/example-labs/jobs/junior-software-engineer",
    pubDate: Math.floor((now.getTime() - 24 * 60 * 60 * 1000) / 1000),
    expiryDate: Math.floor((now.getTime() + 7 * 24 * 60 * 60 * 1000) / 1000),
    locationRestrictions: ["India"],
    categories: ["Software Development"],
    parentCategories: ["Engineering"],
    excerpt: "Build reliable software with the <strong>engineering team</strong>.",
    ...overrides,
  };
}

function apiResponse(jobs: unknown[], updated = updatedAt, totalCount = jobs.length) {
  return { updatedAt: updated, totalCount, jobs };
}

function jobAt(index: number) {
  return `https://himalayas.app/companies/example-labs/jobs/junior-engineer-${index}`;
}

test("normalizes current India-restricted jobs and unrestricted remote jobs", async () => {
  const result = await fetchHimalayasCategory("jobs", {
    now: () => now,
    fetchJson: async (url) => {
      assert.equal(url, __testing.ENDPOINTS.jobs);
      return apiResponse([
        apiJob(),
        apiJob({
          title: "Remote Product Designer",
          companyName: "Open Company",
          employmentType: "Full Time",
          locationRestrictions: [],
          applicationLink: "https://himalayas.app/companies/open-company/jobs/remote-product-designer",
        }),
      ]);
    },
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].source_id, "himalayas-jobs");
  assert.match(result[0].id, /^himalayas:[a-f0-9]{24}$/);
  assert.equal(result[0].source, "Himalayas");
  assert.equal(result[0].category, "jobs");
  assert.equal(result[0].source_url, apiJob().applicationLink);
  assert.equal(result[0].deadline, new Date(apiJob().expiryDate as number * 1000).toISOString());
  assert.equal(result[0].verification_status, "VERIFIED_EXTERNAL");
  assert.equal(result[0].stipend, "Not specified");
  assert.equal(result[0].location, "India");
  assert.deepEqual(result[0].skills, ["Software Development", "Engineering"]);
  assert.match(result[0].description, /engineering team/);
  assert.doesNotMatch(result[0].description, /<[^>]+>/);
  assert.equal(result[1].location, "Not specified");
  assert.equal(result[0].source_updated_at, new Date(updatedAt * 1000).toISOString());
  assert.match(result[0].raw_content_hash, /^[a-f0-9]{64}$/);
});

test("internship feed accepts only Intern listings and uses its fixed query", async () => {
  const result = await fetchHimalayasCategory("internships", {
    now: () => now,
    fetchJson: async (url) => {
      assert.equal(url, __testing.ENDPOINTS.internships);
      return apiResponse([
        apiJob({ title: "India Marketing Intern", employmentType: "Intern" }),
        apiJob({ title: "Permanent Marketing Role", employmentType: "Full Time" }),
      ]);
    },
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].source_id, "himalayas-internships");
  assert.equal(result[0].category, "internships");
});

test("job feed excludes internships and rejects malicious or malformed source URLs", () => {
  const result = normalizeHimalayasResponse("jobs", apiResponse([
    apiJob({ employmentType: "Intern" }),
    apiJob({ applicationLink: "https://evil.example/companies/example/jobs/fake" }),
    apiJob({ applicationLink: "http://himalayas.app/companies/example/jobs/fake" }),
    apiJob({ applicationLink: "https://himalayas.app/apply/123" }),
    apiJob({ applicationLink: "https://user:pass@himalayas.app/companies/example/jobs/fake" }),
  ]), now);
  assert.deepEqual(result, []);
});

test("expired and malformed listings are excluded", () => {
  const result = normalizeHimalayasResponse("jobs", apiResponse([
    apiJob({ expiryDate: Math.floor((now.getTime() - 1) / 1000) }),
    apiJob({ title: "  " }),
    apiJob({ companyName: "" }),
    apiJob({ pubDate: "2026-09-30" }),
    apiJob({ locationRestrictions: ["United States"] }),
    apiJob({ locationRestrictions: [42] }),
  ]), now);
  assert.deepEqual(result, []);
});

test("jobs and internships require a real publication within the past 30 days", () => {
  const day = 24 * 60 * 60;
  for (const category of ["jobs", "internships"] as const) {
    const employmentType = category === "jobs" ? "Full Time" : "Intern";
    const current = normalizeHimalayasResponse(category, apiResponse([
      apiJob({ employmentType, pubDate: Math.floor(now.getTime() / 1000) - 29 * day }),
    ]), now);
    assert.equal(current.length, 1);
    for (const pubDate of [
      Math.floor(now.getTime() / 1000) - 30 * day,
      Math.floor(now.getTime() / 1000) + 60,
      undefined,
    ]) {
      assert.deepEqual(normalizeHimalayasResponse(category, apiResponse([
        apiJob({ employmentType, pubDate }),
      ]), now), []);
    }
  }
});

test("stale and future provider snapshots fail closed", () => {
  assert.doesNotThrow(
    () => normalizeHimalayasResponse("jobs", apiResponse([], updatedAt - 3 * 24 * 60 * 60), now),
  );
  assert.throws(
    () => normalizeHimalayasResponse("jobs", apiResponse([], updatedAt - 15 * 24 * 60 * 60), now),
    /stale or has an invalid update timestamp/,
  );
  assert.throws(
    () => normalizeHimalayasResponse("jobs", apiResponse([], updatedAt + 60 * 60), now),
    /stale or has an invalid update timestamp/,
  );
});

test("invalid provider structure, error response, or failed fetch is rejected", async () => {
  assert.throws(
    () => normalizeHimalayasResponse("jobs", { updatedAt, jobs: {} }, now),
    /missing its jobs array/,
  );
  await assert.rejects(
    fetchHimalayasCategory("jobs", {
      fetchJson: async () => { throw new Error("HTTP 429"); },
    }),
    /HTTP 429/,
  );
});

test("unknown categories and non-company job URLs never enter the source", async () => {
  await assert.rejects(
    fetchHimalayasCategory("competitions" as any, { fetchJson: async () => apiResponse([]) }),
    /Invalid Himalayas category/,
  );
  assert.equal(__testing.safeHimalayasUrl("https://himalayas.app/companies/a/jobs/b?ref=x"), "https://himalayas.app/companies/a/jobs/b");
  assert.equal(__testing.safeHimalayasUrl("https://himalayas.app.evil.example/companies/a/jobs/b"), null);
});

test("at most twenty listings are returned", () => {
  const result = normalizeHimalayasResponse(
    "jobs",
    apiResponse(Array.from({ length: 25 }, (_, index) => apiJob({
      title: `Junior Engineer ${index}`,
      applicationLink: jobAt(index),
    }))),
    now,
  );
  assert.equal(result.length, 20);
});

test("continues past invalid first-page records to find later valid jobs", async () => {
  const requested: string[] = [];
  const result = await fetchHimalayasCategory("jobs", {
    now: () => now,
    fetchJson: async (url) => {
      requested.push(url);
      if (url === __testing.PAGINATION_ENDPOINTS.jobs[0]) {
        return apiResponse([
          apiJob({ title: "", applicationLink: jobAt(1) }),
          apiJob({ locationRestrictions: ["United States"], applicationLink: jobAt(2) }),
        ], updatedAt, 3);
      }
      if (url === __testing.PAGINATION_ENDPOINTS.jobs[1]) {
        return apiResponse([
          apiJob({ title: "Junior Engineer", applicationLink: jobAt(3) }),
        ], updatedAt, 3);
      }
      throw new Error("Unexpected page request");
    },
  });

  assert.deepEqual(requested, __testing.PAGINATION_ENDPOINTS.jobs.slice(0, 2));
  assert.equal(result.length, 1);
  assert.equal(result[0].url, jobAt(3));
});

test("paginates sequentially at most three pages and deduplicates canonical URLs", async () => {
  const requested: string[] = [];
  const result = await fetchHimalayasCategory("jobs", {
    now: () => now,
    fetchJson: async (url) => {
      requested.push(url);
      const page = __testing.PAGINATION_ENDPOINTS.jobs.indexOf(url);
      if (page === 0) {
        return apiResponse([
          apiJob({ applicationLink: `${jobAt(1)}?utm_source=one` }),
          apiJob({ title: "Second role", applicationLink: jobAt(2) }),
        ], updatedAt, 20);
      }
      if (page === 1) {
        return apiResponse([
          apiJob({ title: "Duplicate role", applicationLink: `${jobAt(1)}#apply` }),
          apiJob({ title: "Third role", applicationLink: jobAt(3) }),
        ], updatedAt, 20);
      }
      return apiResponse([
        apiJob({ title: "Fourth role", applicationLink: jobAt(4) }),
      ], updatedAt, 20);
    },
  });

  assert.deepEqual(requested, __testing.PAGINATION_ENDPOINTS.jobs);
  assert.equal(result.length, 4);
  assert.deepEqual(result.map((record) => record.url), [jobAt(1), jobAt(2), jobAt(3), jobAt(4)]);
});

test("stops pagination when a page is empty or totalCount is exhausted", async () => {
  let emptyPageCalls = 0;
  const emptyPageResult = await fetchHimalayasCategory("jobs", {
    now: () => now,
    fetchJson: async () => {
      emptyPageCalls += 1;
      return apiResponse([], updatedAt, 100);
    },
  });
  assert.deepEqual(emptyPageResult, []);
  assert.equal(emptyPageCalls, 1);

  let exhaustedCalls = 0;
  await fetchHimalayasCategory("jobs", {
    now: () => now,
    fetchJson: async () => {
      exhaustedCalls += 1;
      return apiResponse([apiJob()], updatedAt, 1);
    },
  });
  assert.equal(exhaustedCalls, 1);
});

test("failed later pages fail the whole refresh instead of returning partial results", async () => {
  let pageCalls = 0;
  await assert.rejects(
    fetchHimalayasCategory("jobs", {
      now: () => now,
      fetchJson: async () => {
        pageCalls += 1;
        if (pageCalls === 1) return apiResponse([apiJob()], updatedAt, 21);
        throw new Error("HTTP 503 from page two");
      },
    }),
    /HTTP 503 from page two/,
  );
  assert.equal(pageCalls, 2);
});

test("distinct source URLs receive distinct stable opportunity IDs", () => {
  const result = normalizeHimalayasResponse("jobs", apiResponse([
    apiJob(),
    apiJob({
      title: "Junior Data Engineer",
      applicationLink: "https://himalayas.app/companies/example-labs/jobs/junior-data-engineer",
      guid: "https://himalayas.app/companies/example-labs/jobs/junior-data-engineer",
    }),
  ]), now);
  assert.equal(result.length, 2);
  assert.equal(result[0].source_id, result[1].source_id);
  assert.notEqual(result[0].id, result[1].id);
  assert.equal(
    result[0].id,
    `himalayas:${createHash("sha256").update(result[0].url).digest("hex").slice(0, 24)}`,
  );
});