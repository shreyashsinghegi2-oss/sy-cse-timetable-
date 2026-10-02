import { test } from "node:test";
import assert from "node:assert/strict";
import { __testing, lancingSourceMetadata } from "./lancing-sources";

const source = {
  ...lancingSourceMetadata[0],
  enabled: true,
  termsReviewed: true,
};
const now = new Date("2027-01-01T00:00:00.000Z");

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    title: "Student Innovation Challenge",
    company: "Example Organization",
    url: "https://unstop.com/competitions/student-innovation-challenge-123",
    deadline: "2027-02-01T00:00:00.000Z",
    skills: ["Research"],
    stipend: "₹10,000",
    work_mode: "Online",
    ...overrides,
  };
}

test("malformed detail and malformed candidate are rejected", () => {
  assert.equal(__testing.parseDetailPage("<html>not structured listing content</html>", candidate().url as string), null);
  assert.equal(__testing.normalizeVerifiedCandidate(null, source, "listing html", now), null);
  assert.equal(__testing.normalizeVerifiedCandidate(candidate({ title: "  " }), source, "listing html", now), null);
});

test("expired and missing deadlines never qualify as verified", () => {
  assert.equal(__testing.normalizeVerifiedCandidate(candidate({ deadline: "2026-12-31T23:59:59Z" }), source, "detail body", now), null);
  assert.equal(__testing.normalizeVerifiedCandidate(candidate({ deadline: undefined }), source, "detail body", now), null);
});

test("Devfolio stores a real deadline without inventing an organizer or application URL", () => {
  const record = __testing.normalizeDevfolioCandidate({
    id: "devfolio:example-1",
    title: "Student Hackathon",
    url: "https://student-hackathon.devfolio.co/",
    applicationUrl: "https://student-hackathon.devfolio.co/",
    registrationDeadline: "2027-02-01T00:00:00.000Z",
  }, now);
  assert.equal(record?.deadline, "2027-02-01T00:00:00.000Z");
  assert.equal(record?.organizer, null);
  assert.equal(record?.type, "hackathon");
  assert.equal(record?.source_url, "https://student-hackathon.devfolio.co/");
  assert.equal(__testing.cacheIsFresh(record, now), true);
  assert.equal(__testing.normalizeDevfolioCandidate({
    title: "Unknown deadline", url: "https://test.devfolio.co/",
  }, now), null);
  assert.equal(__testing.normalizeDevfolioCandidate({
    title: "Expired", url: "https://test.devfolio.co/", registrationDeadline: "2026-12-31T00:00:00Z",
  }, now), null);
});

test("official contest start times are not presented as registration deadlines", () => {
  const codeforces = lancingSourceMetadata.find((item) => item.id === "codeforces-competitions")!;
  const record = __testing.normalizePublicApiCompetition({
    id: "codeforces:1234", title: "Codeforces Round", url: "https://codeforces.com/contest/1234",
    applicationUrl: "https://codeforces.com/contest/1234",
    deadline: "2027-01-04T00:00:00.000Z", startsAt: "2027-01-04T00:00:00.000Z",
    endsAt: "2027-01-04T02:00:00.000Z", deadlineKind: "START_TIME",
  }, codeforces, now);
  assert.equal(record?.deadlineKind, "START_TIME");
  assert.equal(record?.registrationDeadline, null);
  assert.equal(__testing.cacheIsFresh(record, now), true);
  assert.equal(__testing.normalizePublicApiCompetition({
    id: "codeforces:bad", title: "Wrong start", url: "https://codeforces.com/contest/1235",
    applicationUrl: "https://codeforces.com/contest/1235",
    deadline: "2027-01-04T00:00:00.000Z", startsAt: "2027-01-05T00:00:00.000Z",
    deadlineKind: "START_TIME",
  }, codeforces, now), null);
});

test("public Hackalendar records require a real organiser URL and registration deadline", () => {
  const hackalendar = lancingSourceMetadata.find((item) => item.id === "hackalendar-competitions")!;
  const candidate = {
    id: "event-1", title: "Student Hackathon", url: "https://hackalendar.com/e/student-hackathon",
    applicationUrl: "https://organizer.example/register",
    deadline: "2027-01-06T23:59:59.999Z", registrationDeadline: "2027-01-06T23:59:59.999Z",
    deadlineKind: "REGISTRATION",
  };
  const record = __testing.normalizePublicApiCompetition(candidate, hackalendar, now);
  assert.equal(record?.source_url, candidate.applicationUrl);
  assert.equal(record?.registrationDeadline, candidate.deadline);
  assert.equal(__testing.cacheIsFresh(record, now), true);
  assert.equal(__testing.normalizePublicApiCompetition({ ...candidate, registrationDeadline: null }, hackalendar, now), null);
  assert.equal(__testing.normalizePublicApiCompetition({ ...candidate, url: "https://evil.example/e/student-hackathon" }, hackalendar, now), null);
});

test("Brabble preserves the organiser link and aggregator attribution when configured", () => {
  const brabble = lancingSourceMetadata.find((item) => item.id === "brabble-competitions")!;
  const record = __testing.normalizePublicApiCompetition({
    id: "brabble-1", title: "Student Hackathon",
    url: "https://organizer.example/register", applicationUrl: "https://organizer.example/register",
    shareUrl: "https://brabble.ai/listings/student-hackathon",
    deadline: "2027-01-06T00:00:00.000Z", registrationDeadline: "2027-01-06T00:00:00.000Z",
    deadlineKind: "REGISTRATION", type: "HACKATHON", organizer: "Example Organisation",
  }, brabble, now);
  assert.equal(record?.source_url, "https://organizer.example/register");
  assert.equal(record?.url, "https://brabble.ai/listings/student-hackathon");
  assert.equal(record?.source, "Brabble.ai");
  assert.equal(__testing.normalizePublicApiCompetition({
    id: "brabble-1", title: "Student Hackathon",
    url: "https://organizer.example/register", applicationUrl: "https://organizer.example/register",
    deadline: "2027-01-06T00:00:00.000Z", registrationDeadline: "2027-01-06T00:00:00.000Z",
    deadlineKind: "REGISTRATION",
  }, brabble, now), null);
});

test("successful snapshots retire missing verified competitions without deleting them; failed snapshots preserve them", async () => {
  const oldUrl = "https://old-event.devfolio.co";
  const oldRecord = { url: oldUrl, deadline: "2027-02-01T00:00:00.000Z", verification_status: "VERIFIED_EXTERNAL" };
  const updates: Array<{ id: string; status: string }> = [];
  const db = {
    batch: () => ({
      update: (ref: { id: string }, data: { verification_status: string }) =>
        updates.push({ id: ref.id, status: data.verification_status }),
      set: () => {},
      commit: async () => {},
    }),
    collection: () => ({ doc: (id: string) => ({ id }) }),
  };
  const previous = new Map([[oldUrl, oldRecord]]);
  await __testing.persistSourceSnapshot(db, { id: "source" }, {
    category: "competitions", last_attempted_at: now.toISOString(), last_error: null,
  }, [], previous);
  assert.deepEqual(updates.map((item) => item.status), ["STALE"]);
  updates.length = 0;
  await __testing.persistSourceSnapshot(db, { id: "source" }, {
    category: "competitions", last_attempted_at: now.toISOString(), last_error: "fetch failed",
  }, [], previous);
  assert.deepEqual(updates, []);
});

test("normalization requires actual detail content and hashes it", () => {
  assert.equal(__testing.normalizeVerifiedCandidate(candidate(), source, "", now), null);
  const verified = __testing.normalizeVerifiedCandidate(candidate(), source, "fetched detail HTML", now);
  assert.equal(verified?.verification_status, "VERIFIED_EXTERNAL");
  assert.equal(verified?.source_id, source.id);
  assert.equal(verified?.raw_content_hash.length, 64);
  assert.equal(verified?.last_verified_at, now.toISOString());
  assert.equal(verified?.source_url, candidate().url);
  assert.equal(verified?.source_listing_url, source.listingUrl);
});

test("canonical URL deduplication keeps one record", () => {
  const first = __testing.normalizeVerifiedCandidate(candidate(), source, "first", now)!;
  const duplicate = __testing.normalizeVerifiedCandidate(candidate({
    url: "https://unstop.com/competitions/student-innovation-challenge-123/?utm_source=test#register",
  }), source, "second", now)!;
  assert.equal(__testing.deduplicate([first, duplicate]).length, 1);
});

test("robots disallow blocks matching paths", () => {
  assert.equal(__testing.robotsAllows("User-agent: *\nDisallow: /competitions", source.listingUrl, source.origin), false);
  assert.equal(__testing.robotsAllows("User-agent: *\nDisallow: /api/", source.listingUrl, source.origin), true);
});

test("per-source refresh intervals gate network work and expose disabled status", async () => {
  const jobs = lancingSourceMetadata.find((entry) => entry.category === "jobs")!;
  const internships = lancingSourceMetadata.find((entry) => entry.category === "internships")!;
  assert.equal(jobs.refresh_interval_hours, 6);
  assert.equal(internships.refresh_interval_hours, 12);
  assert.equal(lancingSourceMetadata.filter((entry) => entry.origin === "https://unstop.com")
    .every((entry) => !entry.enabled && entry.status === "disabled"), true);
  assert.equal(lancingSourceMetadata.filter((entry) => entry.origin === "https://himalayas.app")
    .every((entry) => entry.enabled && entry.status === "enabled" && entry.refresh_interval_hours === 12), true);
  assert.equal(__testing.isSourceRefreshDue(jobs, "2026-12-31T19:00:00.000Z", now), false);
  assert.equal(__testing.isSourceRefreshDue(jobs, "2026-12-31T17:59:59.000Z", now), true);
  assert.equal(__testing.isSourceRefreshDue(jobs, "2026-12-31T23:57:00.000Z", now, true), false);
  assert.equal(__testing.isSourceRefreshDue(jobs, "2026-12-31T23:54:00.000Z", now, true), true);

  let fetchCalls = 0;
  const records = await __testing.refreshSource({ ...jobs, termsReviewed: true }, {
    now: () => now,
    lastAttemptedAt: "2026-12-31T19:00:00.000Z",
    fetchPage: async () => { fetchCalls += 1; return ""; },
  });
  assert.deepEqual(records, []);
  assert.equal(fetchCalls, 0);
});

test("cached records for disabled or unreviewed sources are not publishable", () => {
  const disabledSource = lancingSourceMetadata[0];
  assert.equal(__testing.sourceCanPublish(disabledSource.id, disabledSource.category), false);
  assert.equal(__testing.sourceCanPublish("unknown-source", "competitions"), false);
});

test("API records expire after 15 hours or when their posting passes 30 days", () => {
  const freshDeadline = "2027-01-03T00:00:00.000Z";
  assert.equal(__testing.cacheIsFresh({
    source_id: "himalayas-jobs", category: "jobs", verification_status: "VERIFIED_EXTERNAL",
    posted_at: "2026-12-31T00:00:00.000Z",
    last_verified_at: "2026-12-31T11:00:00.000Z", deadline: freshDeadline,
  }, now), true);
  assert.equal(__testing.cacheIsFresh({
    source_id: "himalayas-jobs", category: "jobs", verification_status: "VERIFIED_EXTERNAL",
    posted_at: "2026-12-31T00:00:00.000Z",
    last_verified_at: "2026-12-31T08:59:59.000Z", deadline: freshDeadline,
  }, now), false);
  assert.equal(__testing.cacheIsFresh({
    source_id: "himalayas-internships", category: "internships", verification_status: "VERIFIED_EXTERNAL",
    posted_at: "2026-12-02T00:00:00.000Z",
    last_verified_at: "2026-12-31T23:00:00.000Z", deadline: freshDeadline,
  }, now), false);
  assert.equal(__testing.cacheIsFresh({
    source_id: "himalayas-jobs", category: "jobs", verification_status: "VERIFIED_EXTERNAL",
    last_verified_at: "2026-12-31T23:00:00.000Z", deadline: freshDeadline,
  }, now), false);
  assert.equal(__testing.cacheIsFresh({
    source_id: "unstop-jobs", verification_status: "VERIFIED_EXTERNAL",
    last_verified_at: "2026-12-31T11:00:00.000Z", deadline: freshDeadline,
  }, now), false);
});

test("source refresh commits records and success metadata atomically", async () => {
  const record = __testing.normalizeVerifiedCandidate(candidate(), source, "detail body", now)!;
  const persisted: Array<{ id: string; status?: string }> = [];
  const staged: Array<{ id: string; status?: string }> = [];
  const batch = {
    set: (ref: { id: string }, data: { status?: string }) => { staged.push({ id: ref.id, status: data.status }); },
    commit: async () => { persisted.push(...staged); },
  };
  const db = { batch: () => batch, collection: () => ({ doc: (id: string) => ({ id }) }) };
  await __testing.persistSourceSnapshot(db, { id: "source-metadata" }, { status: "refreshed" }, [record]);
  assert.equal(persisted.length, 2);
  assert.equal(persisted[1].id, "source-metadata");
  assert.equal(persisted[1].status, "refreshed");

  const failedDb = {
    ...db,
    batch: () => ({
      set: batch.set,
      commit: async () => { throw new Error("atomic write failed"); },
    }),
  };
  persisted.length = 0;
  await assert.rejects(
    __testing.persistSourceSnapshot(failedDb, { id: "source-metadata" }, { status: "refreshed" }, [record]),
    /atomic write failed/,
  );
  assert.deepEqual(persisted, []);
});

test("robots restrictions are checked before fetching each detail page", async () => {
  let detailFetches = 0;
  await assert.rejects(__testing.refreshSource({ ...source, termsReviewed: true }, {
    now: () => now,
    delay: async () => undefined,
    fetchPage: async (_source, url) => {
      if (url.endsWith("/robots.txt")) return "User-agent: *\nDisallow: /competitions/blocked";
      if (url === source.listingUrl) return '<a href="/competitions/blocked-listing">detail</a>';
      detailFetches += 1;
      return "";
    },
  }), /robots.txt disallows a detail path/);
  assert.equal(detailFetches, 0);
});

test("scraper failures yield no verified listings", async () => {
  await assert.rejects(__testing.refreshSource(source, {
    now: () => now,
    delay: async () => undefined,
    fetchPage: async (_source, url) => {
      if (url.endsWith("/robots.txt")) return "User-agent: *\nAllow: /";
      throw new Error("simulated network failure");
    },
  }), /simulated network failure/);
});