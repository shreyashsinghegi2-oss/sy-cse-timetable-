# StudentXchange — web (rebuild, phase 1)

New frontend foundation for the StudentXchange rebuild, following the Design Brief and the Product Audit & Handover.

**Stack:** Vite · React 18 · TypeScript · Tailwind v4 · React Router · lucide-react. Deploys to Vercel as a static SPA (`vercel.json` has the fallback rewrite).

## Run
```
npm install
npm run dev      # http://localhost:5173
npm run build
```

## What exists
- Design tokens in `src/index.css` (sky `#38BDF8`, ink `#0B0F14`, greys, Inter, functional state colours only)
- Shared UI primitives in `src/components/ui.tsx` (Button, Card, Badge, Input, Progress, Logo, EmptyState)
- Marketing site: 14-section landing page, sticky header, footer (`/`)
- Shared entry screen (`/login`; `/lancing/login` redirects here)
- Authenticated app shell: sidebar (desktop/tablet), top context bar, bottom nav (mobile), at `/app/*`
- Dashboard and Marketplace browse pattern; other modules are placeholders

## Not done yet (by design)
- No backend/auth wiring: login is UI-only. Connect to the existing Firebase auth and server session; authorization must stay server-side.
- Illustrative content: testimonials, listings, opportunities and dashboard figures are placeholders. Traction numbers come from the business overview.
- Next in the brief's sequence: Collab, Lancing / Career Compass, Placement / Coding / Events, Institution and Admin, then responsive/accessibility QA.
