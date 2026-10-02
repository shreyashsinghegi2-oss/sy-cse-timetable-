import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth, collabFetch, CollabAuthenticationError } from "@/lib/firebase";

function isCollabUrl(url: string): boolean {
  return url === '/api/collab' ||
    url.startsWith('/api/collab/') ||
    url.startsWith('/api/collab?');
}

// Authentication/bootstrap routes intentionally remain anonymous. All other
// Collab routes are protected by verifyJWT and must use collabFetch so Firebase
// readiness and one-time token refresh are handled in one place.
function isAnonymousCollabUrl(url: string): boolean {
  return isCollabUrl(url) && url.startsWith('/api/collab/auth/');
}

async function throwIfResNotOk(res: Response, url?: string) {
  if (!res.ok) {
    let text = '';
    try {
      text = (await res.text()) || res.statusText;
    } catch (_) {
      text = res.statusText || 'Request failed';
    }

    if (res.status === 401) {
      if (url && (url.includes('/api/login') || url.includes('/api/register'))) {
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || errorData.error || "Invalid credentials");
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message !== "Invalid credentials" && !parseError.message.includes("Unexpected")) {
            throw parseError;
          }
          throw new Error(text || "Invalid credentials");
        }
      }

      throw new Error('AUTH_SILENT_FAIL');
    }

    if (res.status === 400 || res.status === 404) {
      try {
        const errorData = JSON.parse(text);
        const errorMessage = errorData.error || errorData.message || text;

        if (errorMessage.includes('Connection request not found') ||
            errorMessage.includes('has expired') ||
            errorMessage.includes('not found')) {
          throw new Error('Request not found or has already been handled. Please refresh the page.');
        }

        throw new Error(errorMessage);
      } catch (e) {
        if (e instanceof Error && !e.message.includes('Unexpected')) throw e;
        if (text.includes('not found') || text.includes('has expired')) {
          throw new Error('Request not found or has already been handled. Please refresh the page.');
        }
        throw new Error(text || 'Request failed. Please try again.');
      }
    }

    if (res.status === 403) {
      throw new Error('AUTH_SILENT_FAIL');
    }

    throw new Error(`Request failed: ${res.status}`);
  }
}

async function getAuthHeaders(url: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  // Marketplace session token fallback for cross-origin iframe / blocked
  // third-party cookie contexts. Sent on EVERY /api/* request so server
  // can synthesize the cookie if the real one was dropped by the browser.
  try {
    const sessionToken = localStorage.getItem('marketplaceSessionToken');
    if (sessionToken) headers['X-Session-Token'] = sessionToken;
  } catch (_) {}

  if (url.includes('/api/admin/') || url.includes('/api/notifications')) {
    try {
      const fbUser = auth.currentUser;
      if (fbUser) {
        const token = await fbUser.getIdToken(false);
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (_) {}
    return headers;
  }

  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const isFormData = data instanceof FormData;

  const headers: Record<string, string> = await getAuthHeaders(url);

  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    const requestInit: RequestInit = {
      method,
      headers,
      body: isFormData ? data : data ? JSON.stringify(data) : undefined,
      credentials: "include",
    };
    res = isCollabUrl(url) && !isAnonymousCollabUrl(url)
      ? await collabFetch(url, requestInit)
      : await fetch(url, requestInit);
  } catch (networkError) {
    if (networkError instanceof CollabAuthenticationError) {
      throw networkError;
    }
    throw new Error('Network error. Please check your connection and try again.');
  }

  await throwIfResNotOk(res, url);

  try {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (_) {}
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const url = queryKey[0] as string;

      const headers = await getAuthHeaders(url);

      const requestInit: RequestInit = {
        credentials: "include",
        headers,
      };
      const res = isCollabUrl(url) && !isAnonymousCollabUrl(url)
        ? await collabFetch(url, requestInit)
        : await fetch(url, requestInit);

      if (unauthorizedBehavior === "returnNull" && (res.status === 401 || res.status === 403)) {
        return null;
      }

      await throwIfResNotOk(res, url);
      return await res.json();
    } catch (error) {
      if (unauthorizedBehavior === "returnNull" && error instanceof Error &&
          (error.message.includes('AUTH_SILENT_FAIL') || error.message.includes('401') || error.message.includes('403'))) {
        return null;
      }
      if (error instanceof Error && error.message.includes('AUTH_SILENT_FAIL')) {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
