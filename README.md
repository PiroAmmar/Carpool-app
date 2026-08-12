# Carpool Hub

A real-time carpool coordination app for a small, closed university group — one admin/driver and a fixed set of regular passengers. Built to replace an ad-hoc WhatsApp group with an actual dashboard: live seat availability, scheduled trips, route presets, and admin-controlled approvals.

This is a private project, not a general-purpose carpooling platform — access is restricted to a single university email domain by design.

## Features

- **Google sign-in restricted to one university domain** — enforced server-side, not just at the UI level
- **Live seat availability** — a car visual (gray/amber/green states) that updates in real time for every connected passenger as bookings come in and get approved
- **Current Route display** — shows the active trip's route directly on the passenger dashboard
- **Admin dashboard** — approve/reject bookings, set pickup times, adjust seat capacity, schedule or cancel trips, manage saved route presets, update the shared rate
- **Email notifications** — instant email to the admin on new bookings, instant email to the passenger on approval, plus a daily digest of pending requests
- **One-tap WhatsApp contact** — a direct `wa.me` link to the admin's real number, no API integration required

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router, TypeScript) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Database, Auth, Realtime | [Supabase](https://supabase.com) (Postgres + Row Level Security) |
| Email | [Resend](https://resend.com) |
| Motion | [Framer Motion](https://www.framer.com/motion/) |
| Hosting | [Vercel](https://vercel.com) |

Chosen specifically to stay on free tiers at this project's scale (1 admin, 10-15 passengers) — see the full reasoning in the project plan.

## Project status

**Phase 1 — Foundation** ✅ this repo currently contains:
- Next.js scaffold with the project's design tokens (colors, fonts) wired into Tailwind
- Supabase client setup (browser + server) and auth middleware
- Google OAuth login flow with the domain restriction enforced in the callback handler
- Database schema (`supabase/schema.sql`) — `users`, `routes`, `trips`, `bookings`, `settings` tables with RLS policies
- A bare dashboard shell (auth-gated, no real UI yet)

Not yet built: the seat visual, booking flow, admin dashboard UI, and notifications — see `SETUP.md` for what's next.

## Getting started

See [`SETUP.md`](./SETUP.md) for full setup instructions, including environment variables, running the database schema, and local development.

Quick version:

```bash
bun install
cp .env.local.example .env.local   # fill in your Supabase/Resend keys
bun run dev
```

## Design system

Dark, "dashboard instrument cluster" aesthetic — asphalt/panel dark tones with a brushed-chrome accent instead of pure white, route-line motifs as structural dividers, and a monospace face reserved for numeric readouts (seat counts, rate, trip time). Full rationale and token values are in the project plan doc.

## License

Private project — not licensed for reuse.
