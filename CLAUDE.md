# CLAUDE.md

## Project Overview

AyoMagic is an AI Content Studio SaaS — a modern web app for AI-powered text generation, chat, image generation, and content management with team workspaces and subscription billing.

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **UI:** shadcn/ui + Tailwind CSS, Lucide icons
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js v5 (credentials + Google OAuth)
- **AI:** Vercel AI SDK (OpenAI, Anthropic, Google)
- **Billing:** Stripe
- **Deploy:** Docker (standalone Node.js) on Coolify

## Common Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint

npx prisma generate  # Regenerate Prisma client
npx prisma migrate dev --name <name>  # Create migration
npx prisma db seed   # Seed database
npx prisma studio    # Database GUI
```

## Key Directories

- `app/` — Next.js App Router pages and API routes
- `components/` — React components (ui/, layout/, dashboard/, chat/, etc.)
- `lib/` — Shared utilities (prisma, auth, utils, validations, constants)
- `actions/` — Server Actions (auth, chat, documents, etc.)
- `prisma/` — Schema and seed file
- `types/` — TypeScript type definitions
- `public/` — Static assets

## Architecture Notes

- Server Components by default; Client Components only for interactivity
- Server Actions for mutations; API routes only for streaming + webhooks
- JWT sessions (no DB session hits per request)
- Credits: simple `{ text: N, image: N }` JSON on User model
- AI providers abstracted via Vercel AI SDK's `getModel()` pattern

## Environment

Copy `.env.example` to `.env`. Key vars: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, AI API keys.
