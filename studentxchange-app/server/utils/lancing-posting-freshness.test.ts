import assert from "node:assert/strict";
import test from "node:test";
import { isRecentPosting, MAX_POSTING_AGE_MS } from "./lancing-posting-freshness";

const now = new Date("2026-10-01T12:00:00.000Z");

test("internal Firestore timestamps and ISO dates must be strictly newer than 30 days", () => {
  const recent = new Date(now.getTime() - MAX_POSTING_AGE_MS + 1);
  assert.equal(isRecentPosting(recent, now), true);
  assert.equal(isRecentPosting(recent.toISOString(), now), true);
  assert.equal(isRecentPosting({ toDate: () => recent }, now), true);
  assert.equal(isRecentPosting(new Date(now.getTime() - MAX_POSTING_AGE_MS), now), false);
  assert.equal(isRecentPosting(new Date(now.getTime() + 1), now), false);
  assert.equal(isRecentPosting(undefined, now), false);
  assert.equal(isRecentPosting("unknown", now), false);
});