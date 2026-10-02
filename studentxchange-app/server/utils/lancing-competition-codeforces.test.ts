import assert from "node:assert/strict";
import { test } from "node:test";
import { collectCodeforcesCompetitions } from "./lancing-competition-codeforces";

const now = new Date("2026-10-01T12:00:00.000Z");

function contest(overrides: Record<string, unknown> = {}) {
  return {
    id: 2261,
    name: "Codeforces Round #2261",
    phase: "BEFORE",
    startTimeSeconds: Math.floor(new Date("2026-10-03T12:00:00.000Z").getTime() / 1000),
    durationSeconds: 7_200,
    ...overrides,
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json; charset=UTF-8" },
  });
}

test("collects only upcoming public Codeforces contests and labels start time honestly", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return jsonResponse({
      status: "OK",
      result: [
        contest({ id: 11, name: "Later Round", startTimeSeconds: 1_798_891_200 }),
        contest({ id: 10, name: "Sooner Round", startTimeSeconds: 1_798_804_800 }),
        contest({ id: 9, name: "Already Started", startTimeSeconds: Math.floor(now.getTime() / 1000) }),
        contest({ id: 8, name: "Not Public Yet", phase: "CODING" }),
      ],
    });
  }) as typeof fetch;

  const records = await collectCodeforcesCompetitions({ fetch: fetchMock, now: () => now });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://codeforces.com/api/contest.list?gym=false");
  assert.equal(requests[0].init?.method, "GET");
  assert.equal(requests[0].init?.redirect, "manual");
  assert.deepEqual(records.map((record) => record.title), ["Sooner Round", "Later Round"]);
  assert.deepEqual(records[0], {
    id: "codeforces:10",
    title: "Sooner Round",
    url: "https://codeforces.com/contest/10",
    applicationUrl: "https://codeforces.com/contest/10",
    deadline: new Date(1_798_804_800 * 1000).toISOString(),
    deadlineKind: "START_TIME",
    registrationDeadline: null,
    startsAt: new Date(1_798_804_800 * 1000).toISOString(),
    endsAt: new Date((1_798_804_800 + 7_200) * 1000).toISOString(),
    description: "",
    organizer: null,
    participationMode: "Online",
    themes: ["coding"],
  });
});

test("returns an empty array when the official API has no upcoming contests", async () => {
  const fetchMock = (async () => jsonResponse({
    status: "OK",
    result: [
      contest({ phase: "FINISHED" }),
      contest({ startTimeSeconds: Math.floor(now.getTime() / 1000) - 1 }),
    ],
  })) as typeof fetch;

  assert.deepEqual(await collectCodeforcesCompetitions({ fetch: fetchMock, now: () => now }), []);
});

test("skips invalid contest records without emitting fabricated data", async () => {
  const fetchMock = (async () => jsonResponse({
    status: "OK",
    result: [
      contest({ id: "not-numeric" }),
      contest({ name: "  " }),
      contest({ startTimeSeconds: "1798804800" }),
      contest({ durationSeconds: 0 }),
      null,
      contest({ id: 12, name: "Valid Round" }),
    ],
  })) as typeof fetch;

  const records = await collectCodeforcesCompetitions({ fetch: fetchMock, now: () => now });
  assert.deepEqual(records.map((record) => record.id), ["codeforces:12"]);
});

test("rejects invalid JSON and malformed Codeforces API envelopes", async () => {
  const invalidJson = (async () => new Response("{not json", {
    status: 200,
    headers: { "content-type": "application/json" },
  })) as typeof fetch;
  await assert.rejects(
    collectCodeforcesCompetitions({ fetch: invalidJson, now: () => now }),
    /malformed JSON/,
  );

  const malformedPayload = (async () => jsonResponse({ status: "FAILED", result: {} })) as typeof fetch;
  await assert.rejects(
    collectCodeforcesCompetitions({ fetch: malformedPayload, now: () => now }),
    /malformed contest-list response/,
  );
});

test("refuses redirects instead of following them", async () => {
  let requestOptions: RequestInit | undefined;
  const redirect = (async (_input: string | URL | Request, init?: RequestInit) => {
    requestOptions = init;
    return new Response(null, { status: 302, headers: { location: "https://evil.example/" } });
  }) as typeof fetch;

  await assert.rejects(collectCodeforcesCompetitions({ fetch: redirect, now: () => now }), /redirects are refused/);
  assert.equal(requestOptions?.redirect, "manual");
});

test("rejects oversized responses before parsing", async () => {
  const oversized = (async () => new Response("{}", {
    status: 200,
    headers: { "content-type": "application/json", "content-length": "2000001" },
  })) as typeof fetch;
  await assert.rejects(
    collectCodeforcesCompetitions({ fetch: oversized, now: () => now }),
    /exceeds the body size limit/,
  );
});