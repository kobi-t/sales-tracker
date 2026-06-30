# SalesTrack

A sales tracking dashboard for calls, revenue, expenses, and ROAS — React
(Vite) frontend, Supabase (hosted Postgres) for storage. No backend server
to run or maintain; the frontend talks to Supabase directly.

## First time setup

See **SETUP.md** for the full walkthrough (create a free Supabase project,
run the schema, deploy to Vercel/Netlify). Short version:

```bash
cd client
cp .env.example .env   # fill in your Supabase URL + anon key
cd ..
npm run install:all
npm run dev
```

Then open http://localhost:5173. The app starts empty — no sample data —
and everything you add is saved to your Supabase database, so it's the same
data whether you open it on your laptop, phone, or after deploying.

## Project structure

```
sales-tracker/
├── client/                 React app (Vite)
│   ├── src/
│   │   ├── api.js          All reads/writes to Supabase
│   │   ├── supabaseClient.js
│   │   ├── pages/           Dashboard, CallLog, Expenses, Reports, Settings
│   │   └── utils/metrics.js Shared KPI/metric calculations
│   └── .env.example
├── supabase-schema.sql      Run once in Supabase's SQL editor
└── SETUP.md                 Deployment walkthrough
```

## Pages

- **Dashboard** — KPIs and charts, reactive to a date-range selector.
- **Call Log** — CRUD table for calls, with page-level metrics (show-up
  rate, conversion rate, revenue per booked call, etc.) above the table.
- **Expenses** — CRUD table for expenses, with page-level metrics (total
  expenses, ad spend, average expense) above the table.
- **Monthly Reports** — pick a month, download Sales Data / Expenses /
  Summary as CSV.
- **Settings** — manage the dropdown options for outcomes, sources, and
  expense categories.

All KPI math lives in `client/src/utils/metrics.js`, shared by the
Dashboard, the per-page metrics, and the Monthly Reports CSV export, so the
numbers always agree no matter where you're looking at them.
