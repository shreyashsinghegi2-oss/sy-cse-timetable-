import assert from "node:assert/strict";
import test from "node:test";
import {
  comparePublicDriveDocsNewestFirst,
  decodePublicDrivesCursor,
  encodePublicDrivesCursor,
  matchesPublicDrivesCursor,
} from "../utils/public-drive-pagination";

function driveDoc(id: string, seconds: number, nanoseconds: number) {
  return {
    id,
    get(fieldPath: string) {
      return fieldPath === "createdAt" ? { seconds, nanoseconds } : undefined;
    },
  };
}

test("public-drive cursor preserves full Firestore timestamp precision", () => {
  const doc = driveDoc("drive-nanos", 1_780_000_000, 987_654_321);
  const encoded = encodePublicDrivesCursor(doc);
  assert.ok(encoded);
  assert.deepEqual(decodePublicDrivesCursor(encoded), {
    id: "drive-nanos",
    seconds: 1_780_000_000,
    nanoseconds: 987_654_321,
  });
});

test("public-drive pagination ordering is stable for equal-millisecond timestamps", () => {
  const docs = [
    driveDoc("a", 1_780_000_000, 100_000_001),
    driveDoc("c", 1_780_000_000, 100_000_002),
    driveDoc("b", 1_780_000_000, 100_000_002),
  ].sort(comparePublicDriveDocsNewestFirst);

  assert.deepEqual(docs.map(doc => doc.id), ["c", "b", "a"]);

  const cursor = decodePublicDrivesCursor(encodePublicDrivesCursor(docs[1]));
  assert.ok(cursor);
  assert.equal(matchesPublicDrivesCursor(docs[1], cursor), true);
  assert.equal(matchesPublicDrivesCursor(docs[2], cursor), false);
});

test("invalid public-drive cursors are rejected", () => {
  assert.equal(decodePublicDrivesCursor("not-a-cursor"), null);
  const invalidPrecision = Buffer.from(JSON.stringify({
    id: "drive",
    seconds: 1_780_000_000,
    nanoseconds: 1_000_000_000,
  })).toString("base64url");
  assert.equal(decodePublicDrivesCursor(invalidPrecision), null);
});