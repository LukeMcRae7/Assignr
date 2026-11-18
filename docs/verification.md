# Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run export:all`. `npm run export:web` prepares the bundle for `npm run test:ui`; the browser tests use locally installed Chrome and check phone, tablet, and desktop workflows. `npx expo-doctor` checks SDK compatibility.

The database tests execute the actual migration in embedded Postgres with separate authenticated users. A live Supabase project and Google provider configuration are still required to verify OAuth, real network reconnects, and synchronization between physical devices. Native bundle checks do not replace device testing.

As of November 17, 2026, npm reports an unpatched [picomatch glob parsing advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) through Expo/Metro tooling. This app does not accept user-supplied glob patterns. The separate minimatch advisory is addressed with a scoped fingerprint-tool override; revisit that override when Expo updates its dependency.
