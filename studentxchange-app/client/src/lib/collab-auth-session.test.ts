import assert from "node:assert/strict";
import {
  COLLAB_TOKEN_KEY,
  LEGACY_COLLAB_TOKEN_KEY,
  clearCollabSession,
  getStoredCollabSession,
  getStoredCollabToken,
  isUsableJwt,
  saveCollabSession,
} from "./collab-auth-session";

class MemoryStorage {
  private values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: new MemoryStorage(),
});

const base64Url = (value: object) => Buffer.from(JSON.stringify(value))
  .toString("base64")
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_");
const jwt = (claims: object) => `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url(claims)}.signature`;
const now = Date.now();
const current = jwt({ exp: Math.floor((now + 60_000) / 1000), email: "student@example.com", uid: "uid-1", userId: 7 });
const expired = jwt({ exp: Math.floor((now - 60_000) / 1000), email: "student@example.com", uid: "uid-1", userId: 7 });

assert.equal(isUsableJwt(current, 0, now), true, "a future JWT is usable");
assert.equal(isUsableJwt(expired, 0, now), false, "an expired JWT is never usable");
assert.equal(isUsableJwt("not-a-jwt", 0, now), false, "malformed tokens are rejected");

assert.equal(saveCollabSession(current, { id: 7, username: "student", email: "student@example.com", uid: "uid-1" }), true);
assert.equal(getStoredCollabSession()?.token, current, "a matching session restores");

clearCollabSession();
localStorage.setItem(COLLAB_TOKEN_KEY, expired);
localStorage.setItem(LEGACY_COLLAB_TOKEN_KEY, current);
localStorage.setItem("collab_user", JSON.stringify({ id: 7, username: "student", email: "student@example.com", uid: "uid-1" }));
assert.equal(getStoredCollabToken(), current, "an expired canonical key cannot shadow a usable legacy token");

localStorage.setItem(COLLAB_TOKEN_KEY, current);
localStorage.setItem("collab_user", JSON.stringify({ id: 8, username: "other", email: "other@example.com", uid: "uid-2" }));
assert.equal(getStoredCollabSession(), null, "token/user identity mismatches do not restore UI authentication");

clearCollabSession();
assert.equal(getStoredCollabToken(), null, "session clearing removes both token keys");

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  get() { throw new Error("storage denied"); },
});
assert.equal(
  saveCollabSession(current, { id: 7, username: "student", email: "student@example.com", uid: "uid-1" }),
  true,
  "an explicit login is retained in memory when storage is denied",
);
assert.equal(getStoredCollabSession()?.token, current, "the memory-only session is available to token resolution");
clearCollabSession();
assert.equal(getStoredCollabToken(), null, "clearing removes the memory-only session too");
console.log("collab-auth-session tests passed");