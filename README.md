# SwachhSeva

A Next.js civic-awareness and reporting prototype for the SwachhSeva student project.

## Stack
- Next.js App Router + TypeScript
- Supabase Auth, PostgreSQL and private Storage
- MapLibre GL with MapTiler modern streets style (demo fallback included)
- Vercel deployment

## Routes
- `/` Home
- `/streets`, `/rivers`, `/nature` Awareness landing pages for separate QR codes
- `/report` Anonymous issue submission
- `/map` Public map (approved reports only)
- `/about` Project and moderation explanation
- `/admin` Faculty-verified reviewer dashboard

## Local setup
1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local`.
3. Add Supabase project URL and anon/publishable key.
4. Add a MapTiler API key for the modern basemap.
5. In Supabase SQL Editor, run `supabase/schema.sql`.
6. Create a Supabase Auth account for the faculty reviewer, then add its Auth UUID to `public.faculty_admins` using the SQL example at the bottom of the schema.
7. Run:
   ```bash
   npm install
   npm run dev
   ```

## Important configuration notes
- Never put a Supabase service-role key in a `NEXT_PUBLIC_*` variable or browser code.
- Anonymous reports are inserted with `pending_review`; the public map reads only the `public_reports` view.
- The review dashboard is protected by Supabase Auth plus the faculty_admins allowlist.
- The project team must independently check photos and remove identifying information before approving.
- Do not mark an issue resolved unless the team has reliable evidence; distinguish project-team updates from authority confirmation.
- Authority email forwarding is intentionally not automated in this first build. Add it only after faculty review, confirmed jurisdiction and verified official contact details.
- Photo storage is private by default. A server-side signed-URL endpoint and a stricter moderation workflow should be added before public photo display.
- The current map uses public map tiles; add attribution and review MapTiler plan limits before launch.

## Hosting
Import this GitHub repository into Vercel, set the environment variables from `.env.example`, and deploy. Configure the Supabase Auth site URL and redirect URLs to the deployed domain. GitHub remains the source repository; Vercel serves the website.

## Current limitations
This is an initial working scaffold. Before a public launch, test database policies with anon and faculty accounts, implement image moderation and signed photo delivery, add rate limiting / abuse controls (prefer a server-side submission endpoint or CAPTCHA), and conduct mobile/accessibility testing.
