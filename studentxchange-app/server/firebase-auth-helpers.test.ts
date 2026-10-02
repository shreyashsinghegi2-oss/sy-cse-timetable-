import assert from "node:assert/strict";
import test from "node:test";
import { isUniqueConstraintError } from "./routes/firebase-auth";

test("unique-constraint detection follows Drizzle cause wrappers", () => {
  assert.equal(isUniqueConstraintError({ cause: { code: "23505" } }), true);
  assert.equal(
    isUniqueConstraintError({
      cause: { cause: { originalError: { code: "already-exists" } } },
    }),
    true,
  );
  assert.equal(isUniqueConstraintError({ cause: { code: "ECONNRESET" } }), false);
  assert.equal(isUniqueConstraintError(new Error("duplicate")), false);
});