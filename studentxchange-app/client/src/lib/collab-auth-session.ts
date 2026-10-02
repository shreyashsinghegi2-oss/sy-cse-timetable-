/**
 * Browser storage helpers for the Student Collab server session.
 *
 * These checks intentionally only reject malformed/expired values. A browser
 * cannot verify an HS256 server JWT, so callers that restore UI state must
 * validate it with the server before treating it as authenticated.
 */
export interface StoredCollabUser {
  id: number;
  username: string;
  email: string;
  uid?: string;
}

export interface StoredCollabSession {
  token: string;
  user: StoredCollabUser;
}

export const COLLAB_TOKEN_KEY = "collabAuthToken";
export const LEGACY_COLLAB_TOKEN_KEY = "collab_jwt";
export const COLLAB_USER_KEY = "collab_user";
export const COLLAB_UID_KEY = "collab_uid";

const DEFAULT_MIN_TTL_MS = 30_000;
let memorySession: StoredCollabSession | null = null;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return atob(padded);
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts.every(Boolean)) return null;

  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;

  try {
    const payload = JSON.parse(decoded);
    return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function isUsableJwt(
  token: string | null | undefined,
  minTtlMs = DEFAULT_MIN_TTL_MS,
  nowMs = Date.now(),
): token is string {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return false;
  return payload.exp * 1000 > nowMs + minTtlMs;
}

export function getJwtExpiryMs(token: string | null | undefined): number | null {
  const payload = token ? decodeJwtPayload(token) : null;
  return payload && typeof payload.exp === "number" && Number.isFinite(payload.exp)
    ? payload.exp * 1000
    : null;
}

/**
 * Prefers the canonical key. The legacy key is considered only when it is
 * independently usable, allowing a previous partial migration to recover
 * without ever returning an expired token.
 */
export function getStoredCollabToken(minTtlMs = DEFAULT_MIN_TTL_MS): string | null {
  const local = storage();
  // This is set only by a successful login in the current JS context. It
  // allows legitimate server-JWT sessions to work when localStorage is denied,
  // without reviving a previous browser user's storage value.
  if (memorySession && isUsableJwt(memorySession.token, minTtlMs)) {
    return memorySession.token;
  }
  if (!local) return null;

  for (const key of [COLLAB_TOKEN_KEY, LEGACY_COLLAB_TOKEN_KEY]) {
    const token = local.getItem(key);
    if (isUsableJwt(token, minTtlMs)) return token;
  }
  return null;
}

function isStoredUser(value: unknown): value is StoredCollabUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "number"
    && Number.isFinite(user.id)
    && typeof user.username === "string"
    && typeof user.email === "string"
    && user.email.length > 0
    && (user.uid === undefined || typeof user.uid === "string");
}

function userMatchesToken(user: StoredCollabUser, token: string): boolean {
  const claims = decodeJwtPayload(token);
  if (!claims) return false;

  if (typeof claims.email === "string" && claims.email.toLowerCase() !== user.email.toLowerCase()) {
    return false;
  }
  if (typeof claims.uid === "string" && user.uid && claims.uid !== user.uid) return false;
  if (typeof claims.userId === "number" && claims.userId !== user.id) return false;
  return true;
}

export function getStoredCollabSession(minTtlMs = DEFAULT_MIN_TTL_MS): StoredCollabSession | null {
  const local = storage();
  if (memorySession && isUsableJwt(memorySession.token, minTtlMs)) {
    return memorySession;
  }
  if (!local) return null;

  // Resolve token and user from the same persistence source. Do not combine a
  // token from one key/source with profile metadata from another account.
  for (const key of [COLLAB_TOKEN_KEY, LEGACY_COLLAB_TOKEN_KEY]) {
    const token = local.getItem(key);
    if (!isUsableJwt(token, minTtlMs)) continue;
    try {
      const parsedUser: unknown = JSON.parse(local.getItem(COLLAB_USER_KEY) || "");
      if (isStoredUser(parsedUser) && userMatchesToken(parsedUser, token)) {
        return { token, user: parsedUser };
      }
    } catch {
      // Continue checking no other source; the user record is shared.
    }
  }
  return null;
}

export function saveCollabSession(token: string, user: StoredCollabUser): boolean {
  if (!isUsableJwt(token, 0) || !isStoredUser(user) || !userMatchesToken(user, token)) return false;

  // Always preserve the current, explicitly authenticated session in memory.
  // This is essential in Safari/private/embedded contexts where localStorage
  // throws, and replaces (rather than falls back to) any prior account.
  memorySession = { token, user };
  const local = storage();
  if (!local) return true;
  try {
    // Keep both names temporarily because older Collab callers still read the
    // legacy key. They always contain the same server-issued token.
    local.setItem(COLLAB_TOKEN_KEY, token);
    local.setItem(LEGACY_COLLAB_TOKEN_KEY, token);
    local.setItem(COLLAB_USER_KEY, JSON.stringify(user));
    if (user.uid) local.setItem(COLLAB_UID_KEY, user.uid);
    else local.removeItem(COLLAB_UID_KEY);
    return true;
  } catch {
    return true;
  }
}

export function clearCollabSession(): void {
  memorySession = null;
  const local = storage();
  if (!local) return;
  try {
    local.removeItem(COLLAB_TOKEN_KEY);
    local.removeItem(LEGACY_COLLAB_TOKEN_KEY);
    local.removeItem(COLLAB_USER_KEY);
    local.removeItem(COLLAB_UID_KEY);
  } catch {
    // Storage can be unavailable in private browsing modes.
  }
}