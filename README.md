# DomainFolio

A premium, multi-tenant SaaS for domain investors: track renewals, listings and
sales in one calm workspace. Vite + React + TypeScript + Tailwind + shadcn/ui on
the front end, Supabase (Postgres + Auth + RLS) on the back end.

> **Product rule:** the app never invents fees, commissions or exchange rates and
> never converts currency. Amounts render exactly as recorded.

---

## 1. Prerequisites

- Node.js 20+ (developed on v24)
- A free [Supabase](https://supabase.com) account
- A [Vercel](https://vercel.com) account (for hosting) — optional for local runs

## 2. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Pick a name, a strong database password, and a region close to you.
3. Wait for provisioning to finish (~1–2 minutes).

## 3. Create the database schema

In the Supabase dashboard open **SQL Editor** → **New query**, then run the
migrations **in order** (copy the whole file each time and click **Run**):

1. `supabase/migrations/0001_init.sql` — tables, enums, indexes, triggers, constraints.
2. `supabase/migrations/0002_policies.sql` — helper functions, Row Level Security policies and RPCs.
3. `supabase/migrations/0003_domains_extend.sql` — folders table and the extra domain
   columns the Domains table shows (`folder_id`, `registered_date`, `min_offer`,
   `auto_renew`, `privacy`, `locked`, `nameservers`, `url_forwarding`, `source`,
   `registry_status`), plus the updated demo seeder.

> If you already ran `0001`/`0002`, you only need to run the migrations you
> haven't yet. `0003` is additive and safe to run on an existing dataset.

## 4. Collect your keys

Supabase dashboard → **Project Settings** → **API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public** key → `VITE_SUPABASE_ANON_KEY`

Never use the `service_role` key in the browser.

## 5. Configure Auth URLs

Supabase dashboard → **Authentication** → **URL Configuration**:

- **Site URL**: `http://localhost:5173` while developing (change to your live
  domain after deploying).
- **Redirect URLs**: add every origin you will use, e.g.
  `http://localhost:5173` and `https://your-app.vercel.app`.

The app sends users back to `window.location.origin` (magic link) and to
`/auth/reset-password` (password reset), so both origins must be allowed.

## 6. Run locally

```bash
cd domainfolio
npm install

# create your local env file
copy .env.example .env.local          # Windows
# cp .env.example .env.local          # macOS / Linux
# then edit .env.local with the two values from step 4

npm run dev
```

Open <http://localhost:5173>. Sign up, confirm your email, complete the 3-step
onboarding. You can seed ~30 realistic demo domains from the onboarding screen or
from **Settings** ("Load demo data").

Other scripts:

| Command              | What it does                          |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Dev server on port 5173 (HMR)         |
| `npm run build`      | Type-check + production build → `dist`|
| `npm run preview`    | Serve the built `dist` locally        |
| `npm run typecheck`  | Types only, no output                 |

## 7. Deploy to Vercel

1. Push this repository to GitHub. The repository root **is** the app, so Vercel
   needs no subdirectory.
2. In Vercel → **Add New… → Project** → import the repository.
3. Leave **Root Directory** at the repository root (the default). Do not point
   it at a subfolder — there isn't one.
4. Framework preset **Vite** (build `npm run build`, output `dist` — `vercel.json`
   already declares this).
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. **Deploy**, then copy the production URL it gives you.
7. Back in Supabase → **Authentication → URL Configuration**, set the **Site URL**
   to the Vercel domain and add it to **Redirect URLs**.

`vercel.json` rewrites all paths to `index.html` so client-side routes such as
`/domains` survive a refresh or a direct link.

### Netlify instead of Vercel

Build command `npm run build`, publish directory `dist`, and add a
`public/_redirects` file containing `/*  /index.html  200`. Set the same two
environment variables.

## 8. Definition of done

- The landing page loads and the theme toggle follows your system.
- Sign-up works, the confirmation email arrives, and onboarding completes.
- Demo data appears on the dashboard and the Domains table.
- Adding, editing, renewing and archiving a domain writes an activity entry.
- Arabic switches the whole UI to RTL.

---

## Environment variables

| Name                     | Required | Notes                                    |
| ------------------------ | -------- | ---------------------------------------- |
| `VITE_SUPABASE_URL`      | yes      | Supabase project URL                      |
| `VITE_SUPABASE_ANON_KEY` | yes      | Public anon key (protected by RLS)        |

Keep real values in `.env.local` (git-ignored). `.env.example` documents the keys
with placeholder values and is safe to commit.
