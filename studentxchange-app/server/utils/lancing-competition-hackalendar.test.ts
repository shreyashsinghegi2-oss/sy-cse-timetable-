import assert from "node:assert/strict";
import test from "node:test";
import {
  __testing,
  collectHackalendarCompetitions,
  type HackalendarCompetition,
} from "./lancing-competition-hackalendar";

const now = new Date("2026-10-01T12:00:00.000Z");

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "a9538449-e563-4fb2-a1bc-7b00f70a8ee3",
    slug: "signalpost-2026",
    name: "Signalpost 2026",
    url: "https://hackalendar.com/e/signalpost-2026",
    startAt: "2026-10-10",
    endAt: "2026-10-21",
    timezone: null,
    mode: "online",
    city: null,
    cityLabel: null,
    countryCode: null,
    prizePool: null,
    isFree: null,
    registrationUrl: "https://builderr.ai/challenges/signalpost",
    registrationDeadline: "2026-10-05",
    organizer: "Builderr",
    description: "A student hackathon.",
    themes: ["ai", "student"],
    cancelled: false,
    withdrawn: false,
    picked: true,
    ...overrides,
  };
}

function jsonResponse(
  data: unknown[],
  meta: Record<string, unknown> = { hasMore: false, nextOffset: null, total: data.length },
  init: { status?: number; contentType?: string } = {},
): Response {
  return new Response(JSON.stringify({ data, meta }), {
    status: init.status ?? 200,
    headers: { "content-type": init.contentType ?? "application/json; charset=utf-8" },
  });
}

function mockFetch(handler: (url: URL, init: RequestInit) => Response | Promise<Response>): typeof fetch {
  return (async (input: string | URL | Request, init: RequestInit = {}) => {
    return handler(new URL(String(input)), init);
  }) as typeof fetch;
}

test("collects real documented event fields and preserves organiser registration links", async () => {
  let calledUrl: URL | null = null;
  let calledOptions: RequestInit | undefined;
  const records = await collectHackalendarCompetitions({
    now: () => now,
    fetch: mockFetch((url, init) => {
      calledUrl = url;
      calledOptions = init;
      return jsonResponse([event()]);
    }),
  });

  assert.equal(calledUrl?.origin, "https://hackalendar.com");
  assert.equal(calledUrl?.pathname, "/api/events");
  assert.equal(calledUrl?.searchParams.get("limit"), "200");
  assert.equal(calledUrl?.searchParams.get("offset"), "0");
  assert.equal(calledOptions?.method, "GET");
  assert.equal(calledOptions?.redirect, "manual");
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], {
    id: "a9538449-e563-4fb2-a1bc-7b00f70a8ee3",
    title: "Signalpost 2026",
    url: "https://hackalendar.com/e/signalpost-2026",
    applicationUrl: "https://builderr.ai/challenges/signalpost",
    deadline: "2026-10-05T23:59:59.999Z",
    registrationDeadline: "2026-10-05T23:59:59.999Z",
    deadlineKind: "REGISTRATION",
    organizer: "Builderr",
    description: "A student hackathon.",
    startsAt: "2026-10-10",
    endsAt: "2026-10-21",
    location: null,
    participationMode: "Online",
    themes: ["ai", "student"],
  } satisfies HackalendarCompetition);
});

test("preserves unknown optional fields as null without inventing organizer, event dates, or images", async () => {
  const [record] = await collectHackalendarCompetitions({
    now: () => now,
    fetch: mockFetch(() => jsonResponse([event({
      organizer: null,
      description: null,
      startAt: null,
      endAt: null,
      cityLabel: null,
      mode: "unknown",
      themes: null,
      registrationDeadline: "2026-10-05T00:00:00Z",
    })])),
  });
  assert.equal(record.organizer, null);
  assert.equal(record.description, null);
  assert.equal(record.startsAt, null);
  assert.equal(record.endsAt, null);
  assert.equal(record.location, null);
  assert.equal(record.participationMode, null);
  assert.equal(record.themes, null);
  assert.equal(record.imageUrl, undefined);
  assert.equal(record.deadline, "2026-10-05T00:00:00.000Z");
});

test("date-only registration deadlines and event end dates include their final day", async () => {
  const [record] = await collectHackalendarCompetitions({
    now: () => new Date("2026-10-05T23:59:59.000Z"),
    fetch: mockFetch(() => jsonResponse([event()])),
  });
  assert.equal(record.registrationDeadline, "2026-10-05T23:59:59.999Z");
  assert.equal(record.endsAt, "2026-10-21");
  assert.equal(__testing.isoDate("2026-10-10"), "2026-10-10T00:00:00.000Z");
  assert.equal(__testing.isoDate("2026-10-10", true), "2026-10-10T23:59:59.999Z");
  assert.equal(__testing.publishedDate("2026-10-10"), "2026-10-10");
  assert.equal(__testing.isoDate("2026-02-30", true), null);
});

test("rejects missing, expired, ended and explicitly cancelled or withdrawn listings", async () => {
  const data = [
    event({ id: "missing-deadline", registrationDeadline: null }),
    event({ id: "expired-deadline", registrationDeadline: "2026-09-30" }),
    event({ id: "ended", endAt: "2026-09-30" }),
    event({ id: "cancelled", cancelled: true }),
    event({ id: "withdrawn", status: "withdrawn" }),
    event({ id: "good" }),
  ];
  const records = await collectHackalendarCompetitions({
    now: () => now,
    fetch: mockFetch(() => jsonResponse(data)),
  });
  assert.deepEqual(records.map((record) => record.id), ["good"]);
});

test("follows documented offsets and deduplicates repeated event IDs and links", async () => {
  const requests: number[] = [];
  const records = await collectHackalendarCompetitions({
    now: () => now,
    fetch: mockFetch((url) => {
      const offset = Number(url.searchParams.get("offset"));
      requests.push(offset);
      if (offset === 0) return jsonResponse([event()], { hasMore: true, nextOffset: 200, total: 1 });
      return jsonResponse([event(), event({ id: "second-id", name: "Another event" })]);
    }),
  });
  assert.deepEqual(requests, [0, 200]);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.id), [
    "a9538449-e563-4fb2-a1bc-7b00f70a8ee3",
    "second-id",
  ]);
});

test("rejects invalid pagination and fails instead of returning a partial multi-page snapshot", async () => {
  await assert.rejects(collectHackalendarCompetitions({
    fetch: mockFetch(() => jsonResponse([], { hasMore: true, nextOffset: null })),
  }), /omitted nextOffset/);

  let calls = 0;
  await assert.rejects(collectHackalendarCompetitions({
    fetch: mockFetch((_url) => {
      calls += 1;
      if (calls === 1) return jsonResponse([event()], { hasMore: true, nextOffset: 200, total: 1 });
      return new Response("unavailable", { status: 503 });
    }),
  }), /HTTP 503/);
  assert.equal(calls, 2);
});

test("stops at the configured page bound rather than silently truncating a longer feed", async () => {
  let calls = 0;
  await assert.rejects(collectHackalendarCompetitions({
    fetch: mockFetch(() => {
      calls += 1;
      return jsonResponse([], { hasMore: true, nextOffset: calls * 200, total: 0 });
    }),
  }), /5-page collection limit/);
  assert.equal(calls, __testing.MAX_PAGES);
  assert.equal(__testing.MAX_RECORDS, 1_000);
});

test("fails closed for noncanonical event URLs, unsafe registration links, and invalid rows", async () => {
  const records = await collectHackalendarCompetitions({
    now: () => now,
    fetch: mockFetch(() => jsonResponse([
      event({ id: "", name: "No ID" }),
      event({ id: "wrong-host", url: "https://evil.test/e/event" }),
      event({ id: "bad-path", url: "https://hackalendar.com/submit/event" }),
      event({ id: "unsafe-application", registrationUrl: "http://builderr.ai/apply" }),
    ])),
  });
  assert.deepEqual(records, []);
});

test("refuses redirects, non-JSON, non-OK and malformed responses", async () => {
  const options: RequestInit[] = [];
  const redirect = mockFetch((_url, init) => {
    options.push(init);
    return new Response(null, { status: 302, headers: { location: "https://evil.test/" } });
  });
  await assert.rejects(collectHackalendarCompetitions({ fetch: redirect }), /redirects are refused/);
  assert.equal(options[0]?.redirect, "manual");

  await assert.rejects(collectHackalendarCompetitions({
    fetch: mockFetch(() => new Response("<html></html>", { headers: { "content-type": "text/html" } })),
  }), /non-JSON/);
  await assert.rejects(collectHackalendarCompetitions({
    fetch: mockFetch(() => new Response("unavailable", { status: 503 })),
  }), /HTTP 503/);
  await assert.rejects(collectHackalendarCompetitions({
    fetch: mockFetch(() => new Response("{no-json", { headers: { "content-type": "application/json" } })),
  }), /malformed JSON/);
  await assert.rejects(collectHackalendarCompetitions({
    fetch: mockFetch(() => new Response(JSON.stringify({ events: [] }), { headers: { "content-type": "application/json" } })),
  }), /documented \{ data, meta \} schema/);
});

test("rejects oversized pages and response bodies", async () => {
  await assert.rejects(collectHackalendarCompetitions({
    fetch: mockFetch(() => jsonResponse(Array.from({ length: 201 }, (_, index) => event({ id: `event-${index}` })))),
  }), /page limit/);

  const largeBody = JSON.stringify({ data: [], meta: { hasMore: false, nextOffset: null, total: 0 } })
    .padEnd(__testing.MAX_RESPONSE_BYTES + 1, " ");
  await assert.rejects(collectHackalendarCompetitions({
    fetch: mockFetch(() => new Response(largeBody, { headers: { "content-type": "application/json" } })),
  }), /body size limit/);
});