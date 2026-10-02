---
name: Student Collab token precedence
description: Prevent stale cached Collab JWTs from breaking profile reads and saves while Firebase is still signed in
---

**Rule:** Student Collab API requests should prefer the active Firebase user's ID token over browser-stored Collab JWTs. On a 401, force-refresh the Firebase token and retry the request once.

**Why:** A cached server JWT can look syntactically valid after it expires. Passing it to the mixed JWT/Firebase verifier first fails server verification and then produces Firebase's misleading “no kid claim” error, even while the user still has a valid Firebase session.

**How to apply:** Any new Student Collab profile read/write helper should use the shared Firebase token getter rather than reading localStorage directly. Keep stored JWTs only as a checked fallback for non-Firebase sessions.

**Session rule:** Wait for Firebase persistence restoration before resolving credentials. UI authentication, profile requests, and shared query requests must use the same identity resolution. A stored token's shape or cached user record is not proof of an active session.

**Why:** Token precedence alone did not fix profile saving: the login context could show authenticated while the request helper found no usable credential. Password-only sessions also need server-backed renewal; forcing Firebase refresh cannot repair them.

**Account switching:** Complete sign-out of the previous Firebase user before publishing a new password-login identity, and clear Collab query caches on identity changes.

**Why:** Otherwise requests or cached profiles can belong to the previous account even when the UI shows the new account. Storage-denied browsers must retain only the current successfully established session in memory.

**Password-only profile ownership:** Legacy SQL password accounts must remain supported without requiring creation of a Firebase login. Their Collab owner identity is derived from the signed SQL account ID, separate from Firebase's UID namespace.

**Why:** Valid password logins previously had no Firebase UID, so credential refresh alone still could not make profile creation work. Never mint Firebase custom tokens for these synthetic Collab owner IDs.

**Concurrent signup:** Treat duplicate account inserts by concurrent login handlers as idempotent only after re-reading and confirming the same verified identity.

**Why:** Main-app Google synchronization and Collab smart-login can run together. Drizzle wraps PostgreSQL unique-constraint errors in `cause`, so checking only the outer error code missed the race.