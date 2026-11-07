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
6. For password reset emails, open Supabase Auth → Emails → Reset Password and change the link to:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset your password</a>
   ```

   This lets members open the link on any device. The default `{{ .ConfirmationURL }}` link also works, through `/auth/callback`, but only in the same browser that requested the reset.
7. Start the app:

   ```bash
   npm run dev
   ```

The app uses Supabase Auth for accounts and cookie-based sessions. User-owned profile rows are protected by row-level security. Credit balance fields are not client-updatable. The notification menu combines session and time-credit activity with announcements published by administrators; notification preferences and read status are saved in the member's browser.

Members who forget their password can use **Forgot password?** on the login page. They get the same "check your email" message whether or not the address has an account. The emailed link signs them in on `/reset-password`, where they choose a new password. Expired or used links return them to `/forgot-password` to request a new one. Supabase's own email rate limits apply.

Members can upload a JPEG, PNG, or WebP profile photo up to 5 MB from Profile → Edit profile. The image is stored in the public `avatars` bucket; upload and removal are restricted to the signed-in member's own storage folder. Rerun the updated schema if the profile table was already created.

## Page access

`src/proxy.ts` (Next.js Proxy, formerly Middleware) checks each page request on the server before anything renders:

- Signed-out visitors are sent to `/login`, which returns them to the page they asked for after logging in.
- Signed-in members who haven't finished onboarding are sent to `/onboarding`. Admins are exempt.
- Signed-in members are sent away from `/login`, `/signup`, and `/forgot-password`, and non-admins away from `/admin`.
- Expiring Supabase sessions are refreshed.

To avoid a database query on every request, the member's onboarding state and role are cached in a five-minute `sbc-access` cookie. It's cleared when a member logs in, logs out, or finishes onboarding. The proxy only steers navigation: API routes and database functions still check access on every read and write. Supabase verifies sessions locally, without a network call, if the project uses asymmetric JWT signing keys (Supabase → Project Settings → JWT Keys).

## Sessions and time credits

After applying the schema, the app can list public, onboarding-complete teacher profiles; request a session; accept or decline requests; and start or finish sessions with both participants. A booking holds the learner's credits. A decline or pre-start cancellation returns them, and credits transfer to the teacher only after both people end the session. Session and wallet writes run through authenticated PostgreSQL functions; clients have read-only access to their own session and wallet records.

The session policy currently requires requests at least one hour ahead and within 90 days, with durations from 30 minutes to 4 hours in 30-minute increments. The app's booking form and database function both enforce these limits.

Each session has an optional "where to meet" field for a video call link, phone number, or meeting place (up to 500 characters). The learner can add it when booking, and either participant can change it from the session room until the session ends. Only the two participants can see it, and only `http`/`https` links are made clickable.

Held credits never stay stuck. The database enforces these timing rules:

- A teacher can accept a request only before its scheduled time. An unanswered request expires at its scheduled time and the learner's credits are returned.
- A confirmed session can be started from 15 minutes before its scheduled time until its scheduled end (start time plus duration). If both people have not started it by then, it closes as "not started" and the learner's credits are returned.
- A session in progress that both people don't end within one hour after its expected finish (actual start plus duration) completes automatically, and the teacher receives the credits.

Overdue sessions are resolved whenever a participant loads their profile, sessions, wallet, or notifications. To also resolve them for members who are not signed in, enable the `pg_cron` extension in Supabase (Database → Extensions) and rerun `supabase/schema.sql`. That schedules `public.resolve_stale_sessions()` every 10 minutes.

The `/teacher` page is the teaching workspace. It shows incoming learner requests, upcoming teaching sessions, scheduled teaching hours, and completed teaching credits. Teachers can accept or decline requests and start or finish sessions from this dashboard.

If you already ran an earlier version of `supabase/schema.sql`, run the updated file again in the Supabase SQL Editor to add the session, wallet, and admin-announcement tables, policies, and functions. The schema is safe to re-run.

## Weekly availability

Teachers set recurring weekly hours, such as Monday 6:00–9:00 PM, in their own time zone from Teaching → **Set weekly hours** (`/teacher/availability`). When booking a teacher who has hours, learners pick from open half-hour start times shown in the learner's own time zone. Only start times where the chosen length fits are offered, and times taken by the teacher's other sessions are left out. `request_session` rejects times outside a teacher's hours. Teachers who haven't set hours keep the free date-and-time picker, and their requests aren't restricted. Daylight-saving changes are handled through the IANA time zone (for example, 9:00 AM in New York stays 9:00 AM local).

## Ratings and reviews

After a session is completed, the learner can rate the teacher from 1 to 5 stars and add an optional comment (up to 500 characters) from the session room. There's one review per session, and the learner can edit it for 30 days after the session ends. Teachers see their reviews on the Teaching dashboard. Other members see each teacher's average rating on Explore and the reviews on the teacher's profile, with reviewers shown by first name only. Reviews are written only through the `submit_session_review` database function.

## Admin access

The admin page shows community totals, recent members, and recent sessions, and lets administrators publish announcements to the notification bell. To promote an existing account, first run the updated `supabase/schema.sql`, then run this in the Supabase SQL Editor with that account's email:

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
#