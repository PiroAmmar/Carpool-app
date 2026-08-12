# Carpool Hub — Phase 1 Setup

This is the Phase 1 skeleton from the project plan: Next.js scaffolded,
Supabase wired up, Google OAuth with domain restriction working, and a
bare dashboard shell. No seat visual or booking flow yet — that's Phase 2.

## 1. Install dependencies

This project uses **bun** (not npm/yarn) — see `AGENTS.md`. Install it
first if you don't have it: `curl -fsSL https://bun.sh/install | bash`

```bash
bun install
```

## 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with your real values:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from
  Supabase → Project Settings → API
- `RESEND_API_KEY` — from Resend → API Keys (not used until Phase 4, but
  fine to add now)
- `ADMIN_EMAIL` — your own email
- `ALLOWED_EMAIL_DOMAIN` — defaults to `nu.edu.pk`, change if your actual
  domain differs

## 3. Set up the database

1. Open your Supabase project → **SQL Editor** → **New Query**
2. Paste in the contents of `supabase/schema.sql`
3. Run it — this creates `users`, `routes`, `trips`, `bookings`, and
   `settings` tables with Row Level Security policies, and enables
   realtime on `bookings` and `trips`

## 4. Make yourself admin

After you log in once (step 6 below), your row will exist in
`public.users` with `role = 'passenger'` by default. Manually update it
to admin:

```sql
update public.users set role = 'admin' where email = 'your-email@nu.edu.pk';
```

(Table Editor → `users` table → edit the row directly also works, no
SQL needed if you prefer clicking.)

## 5. Confirm Google OAuth redirect URIs

In Google Cloud Console → your OAuth client → **Authorized JavaScript
origins**, make sure `http://localhost:3000` is listed (for local dev).

## 6. Run it locally

```bash
bun run dev
```

Visit `http://localhost:3000/login`, sign in with your university Google
account. A non-`@nu.edu.pk` account should get bounced back to `/login`
with an error — worth testing with a personal Gmail account once to
confirm the domain check actually rejects it.

## 7. Deploy to Vercel

1. Push this project to a GitHub repo
2. In Vercel: **Add New → Project** → pick the repo
3. Add the same environment variables from `.env.local` in Vercel's
   project settings (Settings → Environment Variables)
4. Deploy
5. Once deployed, add the Vercel URL (e.g. `https://carpool-hub.vercel.app`)
   to Google Cloud Console's **Authorized JavaScript origins**, and update
   Supabase's **Site URL** (Authentication → URL Configuration) to match

## What's next (Phase 2)

- The car seat visual (SVG, gray/amber/green states)
- Realtime subscription wiring
- The actual booking flow
- Current Route display

Ping me once this is running locally and logging in correctly, and we'll
move into Phase 2.
