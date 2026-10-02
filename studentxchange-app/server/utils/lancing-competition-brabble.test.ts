import { test } from "node:test";
import assert from "node:assert/strict";
import { __testing, collectBrabbleCompetitions } from "./lancing-competition-brabble";

const now = new Date("2026-08-01T12:00:00.000Z");
const apiKey = `brbl_${"a".repeat(64)}`;
const refreshedAt = "2026-08-01T11:00:00.000Z";

function listing(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-123",
    title: "Student Innovation Challenge",
    organiser: "Example Foundation",
    type: "HACKATHON",
    kind: "competition",
    platform: "Devfolio",
    url: "https://organizer.example.org/events/event-123",
    shareUrl: "https://brabble.ai/events/event-123",
    deadline: "2026-09-01T18:30:00.000Z",
    mode: "ONLINE",
    city: "See listing",
    prize: { label: "₹1L", inr: 100000 },
    fee: "Free",
    eligibility: ["College students", "Team size 2–4"],
    registered: 42,
    ...overrides,
  };
}

function envelope(
  listings: unknown[],
  overrides: Record<string, unknown> = {},
) {
  return {
    refreshedAt,
    origin: "store",
    total: listings.length,
    count: listings.length,
    offset: 0,
    limit: 200,
    listings,
    attribution: __testing.ATTRIBUTION,
    ...overrides,
  };
}

function jsonResponse(body: unknown, options: {
  status?: number;
  headers?: Record<string, string>;
  redirected?: boolean;
} = {}): Response {
  const headers = { "content-type": "application/json", ...options.headers };
  return new Response(JSON.stringify(body), {
    status: options.status || 200,
    headers,
  });
}

function stubFetch(body: unknown, options: {
  status?: number;
  headers?: Record<string, string>;
  redirected?: boolean;
  capture?: (url: URL, init?: RequestInit) => void;
} = {}): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    options.capture?.(new URL(input.toString()), init);
    return jsonResponse(body, options);
  }) as typeof fetch;
}

test("requires a correctly formatted server key without exposing it", async () => {
  await assert.rejects(
    collectBrabbleCompetitions({ fetch: stubFetch(envelope([])), now: () => now }),
    /valid Brabble API key is required/,
  );
  const invalidKey = `brbl_${"z".repeat(64)}`;
  await assert.rejects(
    collectBrabbleCompetitions({ apiKey: invalidKey, fetch: stubFetch(envelope([])), now: () => now }),
    (error: Error) => !error.message.includes(invalidKey),
  );
});

test("uses the documented bearer key and bounded listing query", async () => {
  let capturedUrl: URL | null = null;
  let capturedAuthorization: string | null = null;
  const fetcher = stubFetch(envelope([]), {
    headers: { "x-ratelimit-remaining": "999" },
    capture: (url, init) => {
      capturedUrl = url;
      capturedAuthorization = new Headers(init?.headers).get("authorization");
    },
  });
  await collectBrabbleCompetitions({ apiKey, fetch: fetcher, now: () => now });
  assert.equal(capturedUrl?.origin, "https://brabble.ai");
  assert.equal(capturedUrl?.pathname, "/api/listings");
  assert.equal(capturedUrl?.searchParams.get("limit"), "200");
  assert.equal(capturedUrl?.searchParams.get("offset"), "0");
  assert.equal(capturedAuthorization, `Bearer ${apiKey}`);
});

test("preserves organiser links and distinguishes registration deadlines from contest start times", async () => {
  const registration = listing();
  const contest = listing({
    id: "contest-456",
    title: "Online Coding Round",
    kind: "contest",
    deadline: "2026-08-10T14:00:00.000Z",
    url: "https://codeforces.com/contests/round-456",
    platform: "Codeforces",
  });
  const records = await collectBrabbleCompetitions({
    apiKey,
    fetch: stubFetch(envelope([registration, contest])),
    now: () => now,
  });
  assert.equal(records.length, 2);
  assert.equal(records[0].source, "Brabble.ai");
  assert.equal(records[0].url, registration.url);
  assert.equal(records[0].applicationUrl, registration.url);
  assert.equal(records[0].shareUrl, registration.shareUrl);
  assert.equal(records[0].deadlineKind, "REGISTRATION");
  assert.equal(records[0].registrationDeadline, registration.deadline);
  assert.equal(records[0].organizer, "Example Foundation");
  assert.equal(records[0].prize, "₹1L");
  assert.deepEqual(records[0].eligibility, ["College students", "Team size 2–4"]);
  assert.equal(records[0].attribution, __testing.ATTRIBUTION);
  assert.equal(records[1].deadlineKind, "START_TIME");
  assert.equal(records[1].registrationDeadline, null);
  assert.equal(records[1].startsAt, contest.deadline);
  assert.equal(records[1].url, contest.url);
});

test("drops ended deadlines, unsupported kinds, malformed rows and unsafe organiser links", async () => {
  const records = await collectBrabbleCompetitions({
    apiKey,
    fetch: stubFetch(envelope([
      listing({ id: "expired", deadline: "2026-08-01T11:59:59.000Z" }),
      listing({ id: "bad-kind", kind: "other" }),
      listing({ id: "bad-url", url: "javascript:alert(1)" }),
      listing({ id: "missing-deadline", deadline: "not-a-date" }),
      null,
    ])),
    now: () => now,
  });
  assert.deepEqual(records, []);
});

test("requires a fresh Brabble snapshot and stable snapshot across pages", async () => {
  await assert.rejects(collectBrabbleCompetitions({
    apiKey,
    fetch: stubFetch(envelope([listing()], { refreshedAt: "2026-07-31T11:59:59.000Z" })),
    now: () => now,
  }), /older than the 24-hour freshness limit/);

  let calls = 0;
  const fetcher = (async () => {
    calls += 1;
    return jsonResponse(envelope(
      [listing({ id: `page-${calls}` })],
      { total: 2, count: 1, offset: (calls - 1) * 1, limit: 1, refreshedAt: calls === 1 ? refreshedAt : "2026-08-01T11:30:00.000Z" },
    ));
  }) as typeof fetch;
  await assert.rejects(collectBrabbleCompetitions({ apiKey, fetch: fetcher, now: () => now }),
    /snapshot changed during pagination/);
});

test("caps collection to 600 rows and three requests", async () => {
  const offsets: number[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    const url = new URL(input.toString());
    const offset = Number(url.searchParams.get("offset"));
    offsets.push(offset);
    const listings = Array.from({ length: 200 }, (_, index) => listing({
      id: `record-${offset + index}`,
      url: `https://organizer.example.org/events/${offset + index}`,
      shareUrl: `https://brabble.ai/events/${offset + index}`,
    }));
    return jsonResponse(envelope(listings, { total: 800, offset, count: 200 }), {
      headers: { "x-ratelimit-remaining": "997" },
    });
  }) as typeof fetch;
  const records = await collectBrabbleCompetitions({ apiKey, fetch: fetcher, now: () => now });
  assert.equal(records.length, 600);
  assert.deepEqual(offsets, [0, 200, 400]);
});

test("stops before the next page when Brabble reports that the daily quota is exhausted", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls += 1;
    return jsonResponse(envelope([listing()], { total: 2 }), {
      headers: { "x-ratelimit-remaining": "0" },
    });
  }) as typeof fetch;
  await assert.rejects(collectBrabbleCompetitions({ apiKey, fetch: fetcher, now: () => now }),
    /daily rate limit is exhausted/);
  assert.equal(calls, 1);
});

test("refuses redirects, HTTP errors, invalid media types, and malformed schemas", async () => {
  const cases: Array<[Response, RegExp]> = [
    [new Response("", { status: 302, headers: { location: "https://attacker.example/" } }), /redirects are refused/],
    [new Response("", { status: 401, headers: { "content-type": "application/json" } }), /HTTP 401/],
    [new Response("{}", { headers: { "content-type": "text/html" } }), /unexpected content type/],
    [jsonResponse({ listings: [] }), /documented listings schema/],
  ];
  for (const [response, expected] of cases) {
    await assert.rejects(collectBrabbleCompetitions({
      apiKey,
      fetch: (async () => response) as typeof fetch,
      now: () => now,
    }), expected);
  }
});

test("treats placeholder location and prize text as unavailable source data", async () => {
  const records = await collectBrabbleCompetitions({
    apiKey,
    fetch: stubFetch(envelope([listing({
      city: "See listing",
      prize: { label: "See listing", inr: null },
      fee: "See listing",
    })])),
    now: () => now,
  });
  assert.equal(records[0].location, null);
  assert.equal(records[0].prize, null);
  assert.equal(records[0].fee, null);
});

test("bounds the HTTP response body", async () => {
  const oversized = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(__testing.MAX_RESPONSE_BYTES + 1));
      controller.close();
    },
  }), { headers: { "content-type": "application/json" } });
  await assert.rejects(collectBrabbleCompetitions({
    apiKey,
    fetch: (async () => oversized) as typeof fetch,
    now: () => now,
  }), /body size limit/);
});