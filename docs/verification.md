# Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run export:all`. `npm run export:web` prepares the bundle for `npm run test:ui`; the browser tests use locally installed Chrome and check phone, tablet, and desktop workflows. `npx expo-doctor` checks SDK compatibility.

The database tests execute both actual migrations in embedded Postgres with separate authenticated users. Semester coverage includes ownership, stale writes, deletion guards, offline replay, cache upgrades, teaching bounds, travel, and class replacements. Browser tests also cover first-course semester setup, switching, editing dates, and reviewing existing courses.

For local browser workflows, export with `EXPO_NO_DOTENV=1` and empty `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` environment variables, then run `npm run test:ui`. This only changes the generated test bundle; leave `.env.local` intact. A live Supabase project is still required to verify OAuth, real reconnects, and synchronization between physical devices. Native bundle checks do not replace iPhone testing of the full-width time picker and keyboard dismissal.

As of November 17, 2026, npm reports an unpatched [picomatch glob parsing advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) through Expo/Metro tooling. This app does not accept user-supplied glob patterns. The separate minimatch advisory is addressed with a scoped fingerprint-tool override; revisit that override when Expo updates its dependency.
