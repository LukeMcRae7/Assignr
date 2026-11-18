1. Create a Supabase project and run `migrations/202611160001_initial.sql` in its SQL editor.
2. Enable Google in Authentication → Providers. Put the Google client ID and secret **in Supabase**, and register Supabase’s callback URL in Google Cloud.
3. Allow `assignr://auth/callback`, `http://localhost:8081/auth/callback`, and your production web callback in Authentication → URL Configuration. Set the production Site URL.
4. Copy `.env.example` to `.env.local` and set the project URL and publishable key. Never use a service-role key in Expo.
5. Use an Expo development build for native OAuth (`npx eas-cli@latest build --profile development`). The development client is already included.

For an Expo Go development attempt, run `npm run start:go` to use a tunnel hostname. This explicitly selects Expo CLI's ngrok provider to avoid the default Expo gateway when it times out. Supabase rejects non-loopback IP callbacks such as `exp://192.168.…` before checking the allowlist. Scan the new QR code, then copy the callback shown on Assignr's sign-in screen into Supabase's Redirect URLs. The exact scheme may be `exp://` or `exps://`; copy it as shown. Keep Google Cloud's redirect set to Supabase's HTTPS `/auth/v1/callback` address. Expo recommends a development build for reliable OAuth testing.

To check a saved callback without completing Google sign-in, run `npm run auth:check -- "YOUR_CALLBACK_URL"`. It starts and cancels its own diagnostic OAuth attempt, printing only the selected redirect. `accepted: true` means Supabase kept that callback; `false` means it fell back to the Site URL.

Native PKCE uses Expo Crypto for secure randomness and SHA-256. Its verifier is saved in Supabase v2's JSON storage format so the SDK still handles code exchange, session persistence, and token refresh.

Without configuration, the app uses a separate local workspace. Local data is not silently uploaded when an account signs in. Browser deployment must serve `index.html` for app routes. Run `npm test` for scheduling, queue, and database isolation checks.
