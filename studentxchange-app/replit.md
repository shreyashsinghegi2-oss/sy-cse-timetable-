# StudentXchange - Empowering Students Platform

## Overview
StudentXchange is a comprehensive platform designed to be a central hub for student success. It integrates a Marketplace for educational materials, a Collab module for networking and real-time collaboration, and a forthcoming Lancing module for freelancing opportunities. The platform aims to empower students through a unified experience, fostering academic and professional growth.

## User Preferences
- Currency: Indian Rupees (₹) with "INR" labels
- Platform Fee System: Simplified tiered rates (5-15% based on price ranges)
- Terminology: Use "fee" instead of "commission" throughout the application
- Payment Methods: PayU Gateway (primary) + COD (temporarily disabled per user request)
- Contact Phone: 7039862086
- UPI ID: hrishikesh.vallakati2006@oksbi
- Critical Requirement: Order creation MUST work reliably after payments - no failures accepted

## System Architecture
StudentXchange employs a modern tech stack with a React frontend (TypeScript, Vite, Tailwind CSS, shadcn/ui) and an Express.js backend (TypeScript). It utilizes a hybrid database approach, combining PostgreSQL for transactional data and Firebase Firestore for real-time features.

- **Unified Landing Page**: A single, startup-style landing page serves as the entry point, showcasing the Marketplace, Collab, and upcoming Lancing features.
- **Hybrid Database Architecture**: PostgreSQL (Replit Database) is used for core marketplace data (users, products, orders), while Firebase Firestore handles real-time data for Student Collab (profiles, connections, messages).
- **Authentication**: Firebase Authentication manages user authentication with JWTs for Student Collab. Marketplace product uploads use name/email, with optional session-based login for order history and admin features. The Marketplace login page also offers "Continue with Google" (`POST /api/auth/google`), which reuses the same shared Firebase `auth` instance as Collab/Lancing — the server verifies the Firebase ID token via firebase-admin, finds-or-creates the user in the central PostgreSQL `users` table (deduped by `uid` first, then `email`, with auto-suffixed unique username derived from the email prefix), and establishes the marketplace session cookie. The Marketplace `useAuth` hook subscribes to `onAuthStateChanged` so a user already signed into Collab/Lancing is silently recognized when they enter the Marketplace, and Marketplace logout calls `firebaseSignOut(auth)` so a single sign-out cascades across all three modules. The header surfaces an avatar + name dropdown (My Listings, Orders, Logout) when authenticated, with the Google profile photo as the avatar source.
- **StudentLancing Platform**: A dedicated freelancing marketplace with distinct roles for Freelancers and Companies, offering regular jobs, micro tasks, and internships. Freelancer profiles are comprehensive and editable.
- **Student Collab Social Platform**: A LinkedIn-style social network with an Instagram/Facebook-style feed, supporting various post types, social interactions (likes, comments, shares), and real-time connection requests and notifications. It uses Firebase Storage for media uploads and Firestore for real-time updates.
- **Collab Arena**: A talent showcase and competition platform with multiple categories, prize pools, and certification. It includes a dedicated registration flow with UPI payment and an admin dashboard for verification.
- **STATETECH SHOWCASE 2026**: A state-level project showcase event with a multi-step registration process, authentication requirements, and automatic Student Collab profile creation/updates. Free registration is available for specific student groups.
- **Club Elections 2025**: An admin-only system for managing club elections, including nominee management with photo uploads and real-time vote counting.
- **Admin Dashboards**: Secure, role-based admin dashboards for Marketplace, Student Collab, and StudentLancing, providing comprehensive management capabilities, analytics, and mobile-responsive interfaces. Access is restricted to specific email addresses and enforced server-side.
- **Payment Integration**: PayU is integrated for UPI payments in INR.
- **Image Management**: Enhanced image slideshows, mobile optimization, and HEIC support with automatic JPEG conversion.
- **Email Notifications**: Automated transaction and delivery emails via SendGrid.
- **SEO & Indexing**: Comprehensive SEO implementation including JSON-LD schema, Open Graph, Twitter Cards, sitemap, robots.txt, and PWA manifest.
- **Performance Optimization**: Extensive efforts to mitigate Cumulative Layout Shift (CLS) and improve loading performance through font optimization, media wrappers, image handling, and skeleton containment.
- **Production Security**: Implementation of security headers (Helmet.js), secrets management, robust admin route protection, rate limiting, error sanitization, and secure session management.
- **Input-Based Attack Hardening**: Strengthened `sanitizeInput` middleware with NoSQL operator stripping (`$`-prefixed keys), prototype pollution blocking (`__proto__`/`constructor`/`prototype`), expanded XSS pattern detection (script/iframe/embed/object/svg-event/img-event/javascript:/vbscript:/data:text/html/event-handler/CSS expression), object depth limit, per-field length cap (50KB), and suspicious-payload logging. Specific rate limiters applied to brute-force-able endpoints: `auth` (login/register/forgot-password/reset-password/direct-password-reset), `upload` (/api/upload, /api/upload/firebase, /api/products POST), `payment` (/api/payu/pay, /api/payu/verify, /api/create-payment-intent, /api/verify-payment). Multer file filter rejects dangerous extensions (.exe/.sh/.js/.php/.bat/etc.) and path-traversal filenames; magic-bytes verification ensures declared MIME type matches actual file content for JPEG/PNG/GIF/WebP/PDF uploads.
- **Trust Boundary & Authorization Hardening**: Identity is no longer accepted from client request bodies for sensitive operations — `/api/cart` POST, `/api/reviews` POST and `/api/orders` POST now require an authenticated session and derive `userId` exclusively from `req.session.userId` (no body-supplied identity is trusted). `/api/register` strips client-supplied `role` before parsing `insertUserSchema`, so the schema default applies and privileged roles cannot be self-assigned at signup. The `requireAdmin` middleware no longer treats `username === 'admin'` as admin — only the configured `ADMIN_EMAIL` grants admin access, closing a username-squatting bypass. Ownership checks added to: `/api/cart/:id` PUT/DELETE, `/api/cart/user/:userId` DELETE, `/api/cart/:userId` GET, `/api/orders/:userId` GET (admins use `/api/admin/orders`), `/api/reviews/:id` PUT/DELETE (author check), and `/api/reviews` POST now verifies the supplied `orderId` belongs to the session user, contains the reviewed product, and is in a fulfilment-backed status (`paid` / `completed` / `delivered` / `shipped`). The legacy `/api/verify-payment` stub (which previously hard-coded `verified = true` and could mark any order paid without auth) returns `410 Gone`; all PayU completion goes through the real `/api/payu/verify` signature-checked path. Fixed broken auth check on `/api/connections/:id/respond`: previously called `getConnection(userId, userId)` (self-self lookup, never matched the real row) — now fetches the connection by id and verifies the authenticated user is the receiver. All `/api/admin/*` routes plus the admin-facing notification feed (`/api/notifications`, `/api/notifications/unread`, `/api/notifications/:id/read`) and `/api/orders/:id/status` are wrapped in `requireAdmin`: `stats`, `revenue`, `reset-revenue` (×2), `orders` (×2), `users` (×3), `products`, `delivery-reminders`, `trigger-delivery-check`, `orders/:id` DELETE, `products/:id` DELETE, `database/users`, `database/products`, `database/orders`, `database/activity`, `database/execute`, `create-user`. `/api/buyer-requests/:id/status` upgraded from weak username-substring admin check to `requireAdmin`.

## External Dependencies
- **Frontend Frameworks**: React, Vite, Tailwind CSS, shadcn/ui
- **Backend Framework**: Express.js
- **Databases**: PostgreSQL (Replit Database), Firebase Firestore
- **Authentication**: Firebase Admin SDK, Firebase Client SDK
- **Payment Gateway**: PayU
- **File Uploads**: Firebase Storage, Multer
- **Email Service**: SendGrid
- **Session Management**: connect-pg-simple
- **Security**: Helmet.js