export class CollabAuthenticationError extends Error {
  constructor(message = "Not authenticated. Please log in again.") {
    super(message);
    this.name = "CollabAuthenticationError";
  }
}

export interface CollabFetchDependencies {
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

function canRetryRequest(init: RequestInit): boolean {
  return typeof ReadableStream === "undefined" || !(init.body instanceof ReadableStream);
}

/**
 * Creates the small transport used by Student Collab API callers.
 *
 * Dependencies are injected so retry behavior is independently testable and
 * token policy remains in firebase.ts. A 401 is retried only once, and only
 * with a newly resolved credential.
 */
export function createCollabFetch({
  getToken,
  refreshToken,
  fetchImpl = fetch,
}: CollabFetchDependencies) {
  return async function collabFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const send = async (token: string): Promise<Response> => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return fetchImpl(input, {
        ...init,
        headers,
        credentials: init.credentials ?? "include",
      });
    };

    const token = await getToken();
    if (!token) throw new CollabAuthenticationError();

    const response = await send(token);
    if (response.status !== 401 || !canRetryRequest(init)) return response;

    const refreshedToken = await refreshToken();
    if (!refreshedToken || refreshedToken === token) return response;
    return send(refreshedToken);
  };
}