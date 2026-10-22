# Skill Barter Clock

Skill Barter Clock is a time-credit skill exchange prototype built with Next.js, React, TypeScript, and Supabase.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the user profile table, row-level security rules, avatar storage bucket and policies, and a trigger that creates a profile when Supabase Auth registers a user.
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SITE_URL` to the deployed app URL (keep `http://localhost:3000` for local development).
   - `NEXT_PUBLIC_SUPABASE_URL` to the project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project's publishable key. A legacy anon key can be used under `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. In Supabase Auth URL Configuration, set the Site URL to your app URL and add the matching `/auth/callback` URL to the allowed redirect URLs.
5. If email confirmation is enabled, configure the Supabase confirmation email to use its `{{ .ConfirmationURL }}` template value. The app's signup flow displays a check-your-email message and the callback completes the session.
6. Start the app:

   ```bash
   npm run dev
   ```

The app uses Supabase Auth for accounts and cookie-based sessions. User-owned profile rows are protected by row-level security. Credit balance fields are not client-updatable.

Members can upload a JPEG, PNG, or WebP profile photo up to 5 MB from Profile → Edit profile. The image is stored in the public `avatars` bucket; upload and removal are restricted to the signed-in member's own storage folder. Rerun the updated schema if the profile table was already created.

## Sessions and time credits

After applying the schema, the app can list public, onboarding-complete teacher profiles; request a session; accept or decline requests; and start or finish sessions with both participants. A booking holds the learner's credits. A decline or pre-start cancellation returns them, and credits transfer to the teacher only after both people end the session. Session and wallet writes run through authenticated PostgreSQL functions; clients have read-only access to their own session and wallet records.

The session policy currently requires requests at least one hour ahead and within 90 days, with durations from 30 minutes to 4 hours in 30-minute increments. The app's booking form and database function both enforce these limits.

The `/teacher` page is the teaching workspace. It shows incoming learner requests, upcoming teaching sessions, scheduled teaching hours, and completed teaching credits. Teachers can accept or decline requests and start or finish sessions from this dashboard.

If you already ran the earlier profile-only version of `supabase/schema.sql`, run the updated file again in the Supabase SQL Editor to add the session and wallet tables, policies, and functions. The schema is safe to re-run.

## Admin access

The admin page is read-only and shows community totals, recent members, and recent sessions. To promote an existing account, first run the updated `supabase/schema.sql`, then run this in the Supabase SQL Editor with that account's email:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'admin@example.com'
);
```

Admin access is never granted during public signup. The overview is checked inside a restricted database function as well as the API; the admin role is not writable through profile APIs. To revoke access, set that profile's role back to `member` in the SQL Editor.

## Development

```bash
npm run dev
npm run lint
npm run build
```

Supabase project credentials are intentionally not committed. Do not use a service-role key in the browser or expose it through a `NEXT_PUBLIC_` variable.
