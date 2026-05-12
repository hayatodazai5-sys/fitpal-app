# FitPAL Supabase Backend

Project URL:

```text
https://njowabhlydrzezleahwx.supabase.co
```

## Apply The Schema

Run the SQL in:

```text
supabase/migrations/202605080001_fitpal_backend.sql
```

The simplest path is Supabase Dashboard > SQL Editor > New query, paste the file contents, then run it.

This creates the FitPAL backend:

- `profiles` for user profile, role, BMI, goal, and equipment data.
- `workout_plans` for each user's generated active plan.
- `workout_sessions` for completed workouts and progress stats.
- `bmi_logs` for historical body measurement tracking.
- `progress_daily` as a security-invoker progress summary view.
- Auth triggers, updated-at triggers, RLS policies, realtime publication entries, and the `set_user_role` RPC.

The anon key and service-role key are not enough to run DDL from the app. To apply this migration outside the Dashboard, use a direct database connection string/password or a Supabase Management API access token with database write access.

## App Environment

Create a local `.env` file at the project root:

```text
EXPO_PUBLIC_SUPABASE_URL=https://njowabhlydrzezleahwx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is available in Supabase Dashboard > Project Settings > API.

Never put the service-role key in Expo, React Native, or any client-side bundle. It bypasses row-level security and belongs only in a trusted backend or one-time admin scripts.

## Auth Codes

FitPAL uses in-app 6-digit email codes instead of click-to-confirm email links.

Hosted Supabase Auth settings for this project should be:

```text
mailer_otp_length=6
mailer_templates_confirmation_content includes {{ .Token }}
mailer_templates_recovery_content includes {{ .Token }}
```

In the app:

- Signup uses `signUp`, then verifies the email code with `verifyOtp({ type: 'signup' })`.
- Password reset uses `resetPasswordForEmail`, verifies with `verifyOtp({ type: 'recovery' })`, then updates the password.
- Login remains password-based.

## Google Sign-In

The app uses Supabase OAuth with Expo deep linking:

```text
fitpal://auth/callback
```

On web, FitPAL uses the current browser origin plus any deployed base path. This keeps OAuth callbacks on a route that static hosts can serve without rewrite rules. If you need to pin this to one URL, set:

```text
EXPO_PUBLIC_AUTH_REDIRECT_URL=http://localhost:8081
```

The Supabase redirect allow list should include:

```text
fitpal://**
exp://**/--/auth/callback
http://localhost:8081
http://127.0.0.1:8081
```

If Expo starts on a different port, add that exact app root too, for example `http://localhost:8083`. For static hosting under a subpath, add the deployed base path, for example `https://example.com/fitpal`.

To make Google sign-in complete successfully, enable the Google provider in Supabase Dashboard > Authentication > Providers > Google, or patch the project auth config with:

```json
{
  "external_google_enabled": true,
  "external_google_client_id": "your-google-web-client-id",
  "external_google_secret": "your-google-web-client-secret"
}
```

If the credentials are in your shell, configure the hosted project with:

```powershell
$env:SUPABASE_ACCESS_TOKEN="your-supabase-access-token"
$env:GOOGLE_OAUTH_WEB_CLIENT_ID="your-google-web-client-id"
$env:GOOGLE_OAUTH_WEB_CLIENT_SECRET="your-google-web-client-secret"
$body = @{
  external_google_enabled = $true
  external_google_client_id = $env:GOOGLE_OAUTH_WEB_CLIENT_ID
  external_google_secret = $env:GOOGLE_OAUTH_WEB_CLIENT_SECRET
} | ConvertTo-Json
Invoke-RestMethod -Method Patch `
  -Uri "https://api.supabase.com/v1/projects/njowabhlydrzezleahwx/config/auth" `
  -Headers @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" } `
  -ContentType "application/json" `
  -Body $body
```

In Google Cloud Console, create a Web OAuth client and add your Supabase callback URL as an authorized redirect URI:

```text
https://njowabhlydrzezleahwx.supabase.co/auth/v1/callback
```

## First Admin

After creating your admin account through the app or Supabase Auth, run:

```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

After that, admins can call the `set_user_role` RPC from the app service layer.

## Verify

After applying the migration, this should return rows for all required objects:

```sql
select to_regclass('public.profiles') as profiles,
       to_regclass('public.workout_plans') as workout_plans,
       to_regclass('public.workout_sessions') as workout_sessions,
       to_regclass('public.bmi_logs') as bmi_logs,
       to_regclass('public.progress_daily') as progress_daily;
```
