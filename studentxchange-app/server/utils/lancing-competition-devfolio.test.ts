import assert from "node:assert/strict";
import test from "node:test";
import {
  __testing,
  collectDevfolioCompetitions,
  extractDevfolioListingLinks,
  normalizeDevfolioCompetition,
  parseDevfolioDetailPage,
} from "./lancing-competition-devfolio";

const now = new Date("2026-10-01T12:00:00.000Z");
const deadline = "2026-10-02T06:15:00+00:00";

function hackathon(overrides: Record<string, unknown> = {}) {
  return {
    uuid: "aec2f88c6f674e8ca9c87b9074f937ad",
    name: "Innohacks 4.0",
    slug: "innohacks-4",
    desc: "A national-level hackathon organized by Innogeeks.",
    starts_at: "2026-10-10T04:30:00+00:00",
    ends_at: "2026-10-11T12:30:00+00:00",
    location: "KIET Group of Institutions, Ghaziabad, India",
    is_online: false,
    team_min: 2,
    team_max: 4,
    settings: { reg_ends_at: deadline, external_apply_url: null },
    ...overrides,
  };
}

function nextData(data: unknown, pageProps = false): string {
  const payload = pageProps ? { props: { pageProps: { hackathon: data } } } : data;
  return `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script></html>`;
}

function listingHtml(hackathons: Array<Record<string, unknown>>): string {
  return nextData({
    props: {
      pageProps: {
        dehydratedState: {
          queries: [{ state: { data: { open_hackathons: hackathons } } }],
        },
      },
    },
  });
}

function htmlResponse(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

function textResponse(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/plain" } });
}

test("extracts listing links from the SSR open_hackathons structure", () => {
  const links = extractDevfolioListingLinks(listingHtml([
    { uuid: "event-id", slug: "innohacks-4" },
    { uuid: "ignored", slug: "malicious.example" },
    { slug: "../not-a-slug" },
    { uuid: "event-id", slug: "innohacks-4" },
  ]));

  assert.deepEqual(links, [{
    id: "event-id",
    slug: "innohacks-4",
    url: "https://innohacks-4.devfolio.co/",
  }]);
  assert.deepEqual(extractDevfolioListingLinks("<html>no next data</html>"), []);
});

test("parses and normalizes the hackathon object embedded in detail __NEXT_DATA__", () => {
  const record = parseDevfolioDetailPage(
    nextData(hackathon(), true),
    "https://innohacks-4.devfolio.co/",
    now,
  );
  assert.equal(record?.id, "devfolio:aec2f88c6f674e8ca9c87b9074f937ad");
  assert.equal(record?.title, "Innohacks 4.0");
  assert.equal(record?.url, "https://innohacks-4.devfolio.co/");
  assert.equal(record?.applicationUrl, record?.url);
  assert.equal(record?.deadline, new Date(deadline).toISOString());
  assert.equal(record?.registrationDeadline, record?.deadline);
  assert.match(record?.description || "", /organized by Innogeeks/);
  assert.equal(record?.location, "KIET Group of Institutions, Ghaziabad, India");
  assert.equal(record?.isOnline, false);
  assert.equal(record?.participationMode, "On-site");
  assert.equal(record?.teamMin, 2);
  assert.equal(record?.teamMax, 4);
  assert.equal(record?.organizer, undefined);
  const withRegistrationStart = normalizeDevfolioCompetition(hackathon({
    settings: { reg_ends_at: deadline, reg_starts_at: "2026-08-31T18:30:00+00:00" },
    cover_img: "https://assets.devfolio.co/hackathons/example/cover.png",
  }), "https://innohacks-4.devfolio.co/", now);
  assert.equal(withRegistrationStart?.registrationStart, "2026-08-31T18:30:00.000Z");
  assert.equal(withRegistrationStart?.imageUrl, "https://assets.devfolio.co/hackathons/example/cover.png");

  const externalApply = normalizeDevfolioCompetition(hackathon({
    settings: { reg_ends_at: deadline, external_apply_url: "https://apply.example.org/event" },
    organizer: { name: "Innogeeks" },
  }), "https://innohacks-4.devfolio.co/", now);
  assert.equal(externalApply?.organizer, "Innogeeks");
  assert.equal(externalApply?.applicationUrl, "https://apply.example.org/event");
});

test("requires a real future registration deadline and rejects ended events", () => {
  assert.equal(normalizeDevfolioCompetition(hackathon({
    settings: { reg_ends_at: undefined },
  }), "https://innohacks-4.devfolio.co/", now), null);
  assert.equal(normalizeDevfolioCompetition(hackathon({
    settings: { reg_ends_at: "2026-10-01T11:59:59Z" },
  }), "https://innohacks-4.devfolio.co/", now), null);
  assert.equal(normalizeDevfolioCompetition(hackathon({
    ends_at: "2026-09-30T23:59:59Z",
  }), "https://innohacks-4.devfolio.co/", now), null);
  assert.equal(parseDevfolioDetailPage(
    nextData(hackathon({ settings: { reg_ends_at: null } }), true),
    "https://innohacks-4.devfolio.co/",
    now,
  ), null);
});

test("only accepts HTTPS Devfolio root or single-label subdomains", () => {
  for (const url of [
    "http://event.devfolio.co/",
    "https://event.devfolio.co.evil.test/",
    "https://one.two.devfolio.co/",
    "https://user@event.devfolio.co/",
    "https://event.devfolio.co:444/",
  ]) {
    assert.equal(__testing.allowedUrl(url), null, url);
  }
  assert.ok(__testing.allowedUrl("https://devfolio.co/hackathons"));
  assert.ok(__testing.allowedUrl("https://event.devfolio.co/"));
  assert.equal(
    normalizeDevfolioCompetition(hackathon(), "https://event.devfolio.co.evil.test/", now),
    null,
  );
});

test("collects records with per-domain robots checks, delays, and bounded detail requests", async () => {
  const calls: string[] = [];
  const delays: number[] = [];
  const listing = listingHtml([
    { uuid: "one", slug: "innohacks-4" },
    { uuid: "two", slug: "hackify-3" },
  ]);
  const fetchMock = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    assert.equal(init?.redirect, "manual");
    if (url.endsWith("/robots.txt")) return textResponse("User-agent: *\nDisallow:\n");
    if (url === "https://devfolio.co/hackathons") return htmlResponse(listing);
    if (url === "https://innohacks-4.devfolio.co/") return htmlResponse(nextData(hackathon(), true));
    if (url === "https://hackify-3.devfolio.co/") {
      return htmlResponse(nextData(hackathon({
        uuid: "two",
        name: "Hackify 3.0",
        ends_at: "2026-10-12T00:00:00Z",
        settings: { reg_ends_at: "2026-10-05T00:00:00Z" },
      }), true));
    }
    throw new Error(`Unexpected URL ${url}`);
  }) as typeof fetch;

  const records = await collectDevfolioCompetitions({
    fetch: fetchMock,
    now: () => now,
    delay: async (milliseconds) => { delays.push(milliseconds); },
  });
  assert.deepEqual(records.map((record) => record.title), ["Innohacks 4.0", "Hackify 3.0"]);
  assert.deepEqual(calls, [
    "https://devfolio.co/robots.txt",
    "https://devfolio.co/hackathons",
    "https://innohacks-4.devfolio.co/robots.txt",
    "https://innohacks-4.devfolio.co/",
    "https://hackify-3.devfolio.co/robots.txt",
    "https://hackify-3.devfolio.co/",
  ]);
  assert.equal(delays.length, calls.length - 1);
  assert.ok(delays.every((milliseconds) => milliseconds === __testing.SOURCE_DELAY_MS));
});

test("crawler-specific robots rules override wildcard permissions", () => {
  const url = new URL("https://devfolio.co/hackathons");
  assert.equal(__testing.robotsAllows(
    "User-agent: *\nAllow: /hackathons\n\nUser-agent: StudentLancingCompetitionRefresh\nDisallow: /hackathons",
    url,
  ), false);
  assert.equal(__testing.robotsAllows(
    "User-agent: *\nDisallow: /hackathons\n\nUser-agent: StudentLancingCompetitionRefresh\nAllow: /hackathons",
    url,
  ), true);
});

test("fails closed for disallowed robots paths, zero candidates, and zero valid records", async () => {
  const common = {
    now: () => now,
    delay: async () => {},
  };
  await assert.rejects(collectDevfolioCompetitions({
    ...common,
    fetch: (async () => textResponse("User-agent: *\nDisallow: /hackathons")) as typeof fetch,
  }), /robots\.txt disallows the listing path/);

  await assert.rejects(collectDevfolioCompetitions({
    ...common,
    fetch: (async (input: string | URL | Request) => {
      return String(input).endsWith("/robots.txt")
        ? textResponse("User-agent: *\nDisallow:\n")
        : htmlResponse(listingHtml([]));
    }) as typeof fetch,
  }), /zero competition candidates/);

  await assert.rejects(collectDevfolioCompetitions({
    ...common,
    fetch: (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) return textResponse("User-agent: *\nDisallow:\n");
      if (url === "https://devfolio.co/hackathons") return htmlResponse(listingHtml([{ slug: "innohacks-4" }]));
      return htmlResponse(nextData(hackathon({ settings: { reg_ends_at: null } }), true));
    }) as typeof fetch,
  }), /zero valid, current competitions/);
});

test("does not follow redirects and fetches at most fifteen details", async () => {
  let redirectOptions: RequestInit | undefined;
  const redirectFetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    redirectOptions = init;
    return new Response(null, { status: 302, headers: { location: "https://evil.test/" } });
  }) as typeof fetch;
  await assert.rejects(collectDevfolioCompetitions({
    fetch: redirectFetch,
    now: () => now,
    delay: async () => {},
  }), /Unexpected Devfolio content type|Devfolio redirects are refused/);
  assert.equal(redirectOptions?.redirect, "manual");

  const links = Array.from({ length: 20 }, (_, index) => ({ slug: `event-${index}` }));
  assert.equal(extractDevfolioListingLinks(listingHtml(links)).length, 20);
  assert.equal(__testing.MAX_DETAILS, 15);
  const listing = listingHtml(links);
  const detailCalls: string[] = [];
  const cappedFetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) return textResponse("User-agent: *\nDisallow:\n");
    if (url === "https://devfolio.co/hackathons") return htmlResponse(listing);
    detailCalls.push(url);
    const slug = new URL(url).hostname.split(".")[0];
    return htmlResponse(nextData(hackathon({
      uuid: slug,
      name: `Competition ${slug}`,
      settings: { reg_ends_at: deadline },
    }), true));
  }) as typeof fetch;
  const cappedRecords = await collectDevfolioCompetitions({
    fetch: cappedFetch,
    now: () => now,
    delay: async () => {},
  });
  assert.equal(detailCalls.length, 15);
  assert.equal(cappedRecords.length, 15);
});