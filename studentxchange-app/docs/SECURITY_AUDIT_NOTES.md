# Security Audit Notes — Residual Vulnerabilities

**Last updated:** May 2025  
**npm audit result:** 16 vulnerabilities (2 low, 14 moderate) — all accepted

---

## Summary of Remediation

Reduced dependency vulnerabilities from **93 → 16** through:
- `npm audit fix` (resolved ~76 automatically)
- Upgraded `drizzle-orm` to 0.45.2
- Removed `xlsx` / `@types/xlsx` — replaced with native CSV generation
- Added `tar@^7.4.3` npm override
- Upgraded `uuid` to 14.0.0 (direct dependency)
- Upgraded `vite` from 5.4.21 → 6.4.2 (fixes GHSA-4w7w-66w2-5vf9 path traversal)
- Upgraded `@vitejs/plugin-react` to 4.5.1

---

## Accepted Residual Risk — 16 Vulnerabilities

All remaining vulnerabilities are **low/moderate** severity and require breaking major-version downgrades to "fix" per npm audit. These risks are accepted because:

### 1. drizzle-kit chain — 7 moderate vulnerabilities

| Package | Advisory | Reason Not Fixed |
|---------|----------|-----------------|
| `@esbuild-kit/core-utils` | GHSA-67mh-4wv8-2f99 (esbuild dev server CORS) | Abandoned package, frozen at esbuild@0.18.20 |
| `@esbuild-kit/esm-loader` | GHSA-67mh-4wv8-2f99 | Same as above |
| `drizzle-kit` | Inherits above | "Fix" is downgrade from 0.31→0.18 (regression) |
| `esbuild` (nested) | GHSA-67mh-4wv8-2f99 | Only affects esbuild's own dev server, not our server |

**Risk acceptance rationale:** `drizzle-kit` is a dev-only CLI tool used exclusively during database migrations (`npm run db:push`). It is never loaded in the production application. The esbuild vulnerability (GHSA-67mh-4wv8-2f99) affects esbuild's built-in dev web server feature only — we do not use esbuild's serve mode. No production user is exposed.

**Revisit when:** A version of drizzle-kit becomes available that replaces `@esbuild-kit/esm-loader` with `tsx` or similar without requiring a downgrade.

---

### 2. firebase-admin chain — 7 low/moderate vulnerabilities

| Package | Advisory | Reason Not Fixed |
|---------|----------|-----------------|
| `firebase-admin` (v13) | Multiple gRPC/HTTP client advisories | "Fix" requires downgrading to v10.1.0 (major) |
| `@google-cloud/firestore` | Transitive | Tied to firebase-admin version |
| `@google-cloud/storage` | Transitive | Tied to firebase-admin version |
| `google-gax` | Transitive | Tied to firebase-admin version |
| `retry-request` | Transitive | Tied to firebase-admin version |
| `teeny-request` | Transitive | Tied to firebase-admin version |
| `uuid` (nested) | Nested dep | Direct uuid@14.0.0 is safe; only firebase-admin's internal uuid is old |
| `@tootallnate/once` | Low | Tied to firebase-admin version |
| `http-proxy-agent` | Low | Tied to firebase-admin version |

**Risk acceptance rationale:** `firebase-admin` v13 is the current supported major version. Downgrading to v10 would be a regression, not a security improvement. These advisories are in Google's own gRPC/HTTP client stack and are rated **moderate or low**. No CVSS >7 score applies here. firebase-admin is used only in server-side auth verification — not in user-facing request paths that handle untrusted input.

**Revisit when:** Google publishes a firebase-admin version that resolves these transitive advisories.

---

### 3. firebase-tools chain — 2 moderate vulnerabilities

| Package | Advisory | Reason Not Fixed |
|---------|----------|-----------------|
| `firebase-tools` | GHSA for gaxios, universal-analytics | "Fix" is downgrade v14→v1.2 (absurd regression) |
| `gaxios` | Transitive | Tied to firebase-tools |

**Risk acceptance rationale:** `firebase-tools` is a dev-only CLI tool used for Firebase deployment and emulator tasks. It is never deployed in production. Downgrading from v14 to v1.2 would remove years of security patches.

**Revisit when:** firebase-tools v14+ ships with a non-vulnerable gaxios version.

---

## Image Binaries Note

Image files in `/public/` and `client/public/` are intentional product assets:
- `/public/` — Favicons, PWA icons, Open Graph image, platform logo (SEO/PWA requirement)
- `client/public/` — Partner logos (ADYPU, sponsor/club logos used in NETX and STATETECH pages)
- `/public/netx-qr.png` — UPI QR code for NETX 2026 registration payment (intentional feature)

---

## Monitoring

Run `npm audit` before each deployment. Any **critical or high** severity vulnerability must be resolved before release. The 16 residual low/moderate advisories listed here are pre-approved for continued deployment.
