# Scotch Club App

A repo-ready Next.js MVP for your private whiskey review club.

## What is included
- Recent reviews home page
- Whisky list
- Whisky detail page
- Leaderboard
- Add review form
- Supabase wiring via environment variables

## Before you run it
1. In Supabase, run your schema SQL.
2. Import these CSVs in order:
   - profiles.csv
   - whiskies.csv
   - tasting_sessions.csv
   - reviews.csv
3. Create `.env.local` from `.env.example`.
4. Put your real anon key into `.env.local`.

## Local run
```bash
npm install
npm run dev
```

## Deploy to Vercel
1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Add these env vars in Vercel project settings:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Deploy.

## Notes
- This MVP assumes your imported schema matches the SQL we prepared earlier.
- The add-review form currently writes directly with the anon key, so if you turn on Row Level Security later you will need policies for insert/select.
- For a later polish pass, add auth, profile mapping, bottle photos, session pages, and edit/delete flows.
