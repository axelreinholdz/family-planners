# Family Planners

Local-first weekly family planner for a kitchen iPad. Swedish UI.

## Features

- **Vecka** — everyone on one week grid; large activity icons for the kids
- **Idag** — skärmtid, middag, nästa aktivitet, and morning routines
- **Att göra** — shared checklist
- **Hantera** — activities, återkommande mallar, rutiner, middagsmeny, skärmtid, people

Without Supabase, data stays in **IndexedDB** on the device.  
With Supabase configured, data syncs across devices (email/password or magic-link login + family invite code).

## Supabase setup (multi-device sync)

1. **Accept Marketplace terms** (if using Vercel):  
   https://vercel.com/axelreinholdzs-projects/~/integrations/accept-terms/supabase?source=cli  
   Then run `npx vercel integration add supabase` and `npx vercel env pull .env.local`.

   Or create a project at [supabase.com](https://supabase.com) and copy URL + anon key into `.env.local` (see `.env.example`).

2. **Run the schema** in the Supabase SQL Editor (in order):  
   - `supabase/migrations/001_family_planner.sql`  
   - `supabase/migrations/002_fix_create_family.sql`  
   - `supabase/migrations/003_user_settings.sql` (per-user Hantera PIN hash)

3. **Auth URL config** in Supabase → Authentication → URL configuration:  
   - Site URL: `http://localhost:3000` (and production URL)  
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://family-planners.vercel.app/auth/callback`

4. In Supabase → Authentication → Providers → **Email**: enable Email provider (password sign-in is on by default). Optionally turn off “Confirm email” while testing so new accounts work without inbox access.

5. Restart `npm run dev`. Log in (or create account) with email/password → create a family on the first device → use the invite code under **Hantera → Inställningar** on phone/other browsers.

**Hantera PIN:** Each signed-in user has their own PIN (synced via `user_settings`). It is stored as a SHA-256 hash (soft parental gate, not high security). Default is `1234` until changed under Inställningar. Without login, the PIN stays device-local in localStorage.

## Develop

```bash
npm install
npm run icons   # optional: regenerate PWA icons
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production (Vercel)

- App: https://family-planners.vercel.app  
- Project is linked to this GitHub repo — pushes to `main` deploy automatically.
- Add the same `NEXT_PUBLIC_SUPABASE_*` env vars in the Vercel project settings.

## Install on iPad

1. Open https://family-planners.vercel.app in Safari on the kitchen iPad
2. Share → **Add to Home Screen**
3. Open from the home screen for fullscreen / offline use

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run icons` — generate `public/icon-*.png`
