# Launching SalesTrack with real cross-device storage

This version stores data in Supabase (hosted Postgres) instead of a local
file, so it works the same whether you open it on your laptop or your phone —
it's one shared database in the cloud. There's no mock/sample data anymore;
the app starts empty and only shows what you enter.

Total cost to launch this for yourself: **$0/month** on the free tiers below,
unless your usage grows well beyond a single person's call/expense log.

## 1. Create a Supabase project (the database)

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project (pick any name/region, set a database password — you
   won't need the password day-to-day, Supabase manages it).
3. Once it's ready, open **SQL Editor** in the left sidebar → **New query**.
4. Paste in the contents of `supabase-schema.sql` (in this folder) and run it.
   This creates the `calls`, `expenses`, and `settings` tables — empty, no
   sample rows.
5. Go to **Project Settings → API**. You'll need two values from this page:
   - **Project URL**
   - **anon public** key

## 2. Connect the app to your database

In the `client/` folder, copy `.env.example` to `.env` and fill in the two
values from step 1:

```bash
cd client
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Run it locally to confirm it works

```bash
npm run install:all
npm run dev
```

Open http://localhost:5173 — you should see an empty Dashboard (no fake
data). Add a call or an expense and refresh the page; it should still be
there, because it's now saved in Supabase rather than your browser.

## 4. Deploy it so you can open it from any device

The easiest free option is **Vercel**:

1. Push this project to a GitHub repo (or use `vercel` CLI directly without
   git — `npm i -g vercel`, then `vercel` from the `client/` folder).
2. In [vercel.com](https://vercel.com), "Add New Project" → import the repo.
3. Set the **root directory** to `client`.
4. Add the same two environment variables from step 2
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel's project
   settings → Environment Variables.
5. Deploy. You'll get a URL like `salestrack.vercel.app` that works from any
   browser, on any device, logged in or not — and all of them read/write the
   same Supabase database.

Netlify works the same way if you'd rather use that (root directory
`client`, build command `npm run build`, publish directory `dist`, same two
env vars).

## Adding real multi-user auth (optional, do this before sharing widely)

Right now the database's security policies allow anyone with your app's URL
and anon key to read/write all the data — fine for "just me, on my devices,"
risky if you're going to hand the link to clients or a team. Before doing
that:

1. Turn on Supabase Auth (email/password or magic link) — a few lines, see
   [supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth).
2. Add a `user_id` column to `calls` and `expenses`, set automatically to
   `auth.uid()`.
3. Replace the permissive RLS policies in `supabase-schema.sql` with ones
   like `using (auth.uid() = user_id)`, so each person only sees their own
   data.

Tell me when you're ready for this and I'll wire it up — it's a relatively
small change on top of what's already here.
