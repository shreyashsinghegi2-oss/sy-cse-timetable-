---
name: Google sign-in on custom domain
description: Why Google auth silently fails on studentxchange.in and the same-origin proxy fix that makes it work
---

**Rule:** On studentxchange.in, the whole Google sign-in round-trip must be same-origin: the server proxies `/__/auth/*` (and `/__/firebase/*`) to `https://<project>.firebaseapp.com`, and the client sets `authDomain = window.location.hostname` for `studentxchange.in`/`www.studentxchange.in` only (dev/Replit keeps `VITE_FIREBASE_AUTH_DOMAIN`).

**Why:** With `authDomain` on firebaseapp.com, Safari ITP and Chrome third-party storage partitioning silently drop the auth state — users complete the Google consent screen and bounce back to the login page unauthenticated, with no error. Client-side loading-gate tweaks cannot fix this. Popup-first with redirect fallback remains the flow pattern.

**Proxy constraints:**
- Register the proxy BEFORE all other middleware (no CSP headers, rate limiting, body parsing, sanitization).
- Strip `x-frame-options`/CSP/COOP/COEP from proxied responses so the handler iframe loads.
- Forward only an allowlist of request headers — NEVER `cookie`/`authorization`/`x-session-token` (leaks our app credentials to the external host).

**Required one-time console config (user action, or prod fails):**
1. Firebase Console → Authentication → Settings → Authorized domains: add `studentxchange.in` and `www.studentxchange.in`.
2. Google Cloud Console → Credentials → the OAuth 2.0 Web client used by Firebase Auth → Authorized redirect URIs: add `https://studentxchange.in/__/auth/handler` and `https://www.studentxchange.in/__/auth/handler`.

**How to apply:** on any future custom-domain auth trouble, first check `curl https://studentxchange.in/__/auth/handler` returns the Firebase handler HTML before touching client auth hooks.

Related: the service worker must never cache HTML documents or JS bundles — Vite content-hashed filenames mean a cached old HTML references deleted bundles after deploy, producing Chrome's native "Something went wrong" PWA page.
