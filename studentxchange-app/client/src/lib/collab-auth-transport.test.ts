import assert from "node:assert/strict";
import { CollabAuthenticationError, createCollabFetch } from "./collab-auth-transport";

const headersFor = (calls: RequestInit[], index: number) =>
  new Headers(calls[index].headers).get("Authorization");

// Auth readiness is represented by an unresolved injected token provider: no
// network request may start before it resolves to a credential.
{
  let resolveToken!: (token: string | null) => void;
  const readyToken = new Promise<string | null>((resolve) => { resolveToken = resolve; });
  const calls: RequestInit[] = [];
  const collabFetch = createCollabFetch({
    getToken: () => readyToken,
    refreshToken: async () => "unused",
    fetchImpl: async (_input, init = {}) => {
      calls.push(init);
      return new Response("ok");
    },
  });

  const request = collabFetch("/api/collab/student-profile");
  await Promise.resolve();
  assert.equal(calls.length, 0, "transport waits for auth readiness/token resolution");
  resolveToken("firebase-ready-token");
  await request;
  assert.equal(headersFor(calls, 0), "Bearer firebase-ready-token");
}

// A 401 retries exactly once with a fresh provider token.
{
  const calls: RequestInit[] = [];
  let refreshes = 0;
  const collabFetch = createCollabFetch({
    getToken: async () => "old-firebase-token",
    refreshToken: async () => {
      refreshes += 1;
      return "fresh-firebase-token";
    },
    fetchImpl: async (_input, init = {}) => {
      calls.push(init);
      return new Response("", { status: calls.length === 1 ? 401 : 200 });
    },
  });

  const response = await collabFetch("/api/collab/student-profile", { method: "POST", body: "{}" });
  assert.equal(response.status, 200);
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 2);
  assert.equal(headersFor(calls, 0), "Bearer old-firebase-token");
  assert.equal(headersFor(calls, 1), "Bearer fresh-firebase-token");
}

// Server-JWT-only sessions are valid transport inputs; the transport does not
// require Firebase nor transform the server credential.
{
  const calls: RequestInit[] = [];
  const collabFetch = createCollabFetch({
    getToken: async () => "server-jwt-only-token",
    refreshToken: async () => "unreachable",
    fetchImpl: async (_input, init = {}) => {
      calls.push(init);
      return new Response("ok");
    },
  });

  await collabFetch("/api/collab/student-profile");
  assert.equal(headersFor(calls, 0), "Bearer server-jwt-only-token");
}

// Missing or unchanged credentials do not cause an unauthenticated/revoked
// request to be replayed.
{
  const noCredential = createCollabFetch({
    getToken: async () => null,
    refreshToken: async () => "unused",
    fetchImpl: async () => {
      throw new Error("fetch must not run without a credential");
    },
  });
  await assert.rejects(noCredential("/api/collab/student-profile"), CollabAuthenticationError);

  let calls = 0;
  const unchangedRefresh = createCollabFetch({
    getToken: async () => "stale-token",
    refreshToken: async () => "stale-token",
    fetchImpl: async () => {
      calls += 1;
      return new Response("", { status: 401 });
    },
  });
  const response = await unchangedRefresh("/api/collab/student-profile");
  assert.equal(response.status, 401);
  assert.equal(calls, 1, "unchanged refresh token is never replayed");
}

console.log("collab-auth-transport tests passed");