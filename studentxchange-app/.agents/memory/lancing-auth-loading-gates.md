---
name: Lancing auth loading gates
description: Rules for auth/role loading state in the Lancing module to avoid login stranding and dashboard bounce loops
---

- Any redirect decision based on role/hasSelectedRole must wait for `dataLoaded` from useLancingAuth. Auth (`authLoading`) resolves before the Firestore role fetch — deciding on role while `dataLoaded` is false bounces logged-in users to role-select.
  **Why:** production bug — users landed back on login/role-select after successful Google login because dashboards redirected before role data arrived.
  **How to apply:** every new Lancing route guard: gate on `authLoading` → then `isAuthenticated` → then `if (!dataLoaded) return` → then role checks. Include `dataLoaded` in the effect dependency array (forgetting it causes a perpetual loader).
- The slow-Firestore timeout in the auth hook MUST set `dataLoaded=true` (not just loadError). Login-page redirects wait for `dataLoaded`; leaving it false strands an authenticated user on the login screen forever when Firestore hangs.
