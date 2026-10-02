# StudentXchange — Internal Documentation

This folder contains internal guides and operational documentation for the platform.

## Contents

| File | Description |
|------|-------------|
| [ADMIN_USER_CREATION_GUIDE.md](./ADMIN_USER_CREATION_GUIDE.md) | How to create admin users |
| [DATABASE_ADMIN_GUIDE.md](./DATABASE_ADMIN_GUIDE.md) | Database management & migrations |
| [SECURITY_AUDIT_NOTES.md](./SECURITY_AUDIT_NOTES.md) | Security review notes & findings |
| [LAUNCH_OPTIMIZATION_REPORT.md](./LAUNCH_OPTIMIZATION_REPORT.md) | Performance optimizations applied at launch |
| [MOBILE_OPTIMIZATION_GUIDE.md](./MOBILE_OPTIMIZATION_GUIDE.md) | Mobile responsiveness guide |
| [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md) | Pre-launch verification checklist |

## Quick Setup

1. Copy `.env.example` → `.env` and fill in all values
2. Run `npm install`
3. Run `npm run db:push` to sync the database schema
4. Run `npm run dev` to start development server
