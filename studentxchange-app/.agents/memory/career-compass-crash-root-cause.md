---
name: Career Compass crash root cause
description: Documents the two bugs that caused the "Something went wrong" error boundary on the Career Compass page when clicking a track card.
---

## Bugs Fixed

### 1. Undefined `orgLabel` ReferenceError
- `orgLabel` was used at JSX line ~2627 (inside the main `CareerCompassPage` component body) but was never defined in that scope.
- In production, esbuild strips TS types but keeps runtime JS — so the missing variable became a `ReferenceError` the moment that render branch executed, crashing the whole component tree.
- Fix: define `orgLabel` as a `const` in the component body before any JSX references.

### 2. Temporal Dead Zone from `trackFromUrl` ordering
- `trackFromUrl` const was placed **after** a `useEffect` whose dependency array included it — a classic JS TDZ error.
- The `useEffect` at ~line 1913 listed `trackFromUrl` in deps, but the `const` declaration was at ~line 1970.
- Fix: move the `const trackFromUrl` declaration to before all hooks that reference it.

**Why:** These bugs were introduced during the SPCR→StudentXchange/Placement Cell renaming session; `orgLabel` was added to the JSX without a corresponding definition in component scope, and `trackFromUrl` was inserted at an incorrect position relative to its consuming hooks.

## Separate Routes also Added
- `/lancing/career-compass/personal` and `/lancing/career-compass/institutional` registered in App.tsx.
- `handleTrackSelect` navigates to the route URL (in addition to calling `setTrack`).
- URL path is read via `useLocation` and takes priority over localStorage to restore track on mount.
- All "back/switch track" buttons now call `setLocation("/lancing/career-compass")` alongside `setTrack(null)`.
