# Skill Barter Clock

Skill Barter Clock is a time-credit skill exchange prototype built with Next.js, React, TypeScript, and Supabase.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the user profile table, row-level security rules, and a trigger that creates a profile when Supabase Auth registers a user.
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

## Development

```bash
npm run dev
npm run lint
npm run build
```

Supabase project credentials are intentionally not committed. Do not use a service-role key in the browser or expose it through a `NEXT_PUBLIC_` variable.
