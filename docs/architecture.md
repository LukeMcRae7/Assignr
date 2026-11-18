# Assignr

Expo Router + React Native + TypeScript share screens across phones, tablets, and web. Small UI primitives and theme tokens keep the supplied designs consistent. Routes contain navigation only; features live outside `src/app`.

`domain` owns validation, recurrence expansion, assignment sorting, and timeline construction. Courses belong to semesters. Regular class rules inherit inclusive teaching dates and the semester's captured timezone at read time; standalone schedules keep their own bounds. A one-off child event replaces or cancels one occurrence. Assignments contain small ordered subtask arrays.

`data` owns an account-scoped durable cache and mutation queue. Supabase stores semesters, courses, events, and preferences with row-level security and same-owner foreign keys. A transactional RPC applies version-checked, idempotent mutations. Conflicting edits remain queued until the user chooses a version. Realtime, foreground refresh, and reconnect trigger synchronization. Tombstones propagate deletions. Cache schema 2 upgrades the existing account key in place and keeps pending mutations intact. Existing courses remain unassigned until reviewed.

Google OAuth uses Supabase PKCE and system-browser redirects. Native sessions use SecureStore; web uses the auth client's browser storage. No service-role key belongs in the app. Local mode works without backend configuration and remains separate from signed-in accounts.

Implementation order: shell and courses; events and assignments; calendar and Today; auth and sync; interaction and build checks. Test scheduling across DST, replacements, overlapping activities, due-date sorting, persistence, retry, and conflicts. Cloud access policies also have executable database tests.

Defaults: system appearance, blue accent, device timezone for display, Sunday-first calendar, 11:59 PM due time. Semester timezones are detected at creation and stay fixed when travelling. Focus defaults to the current semester, then the next, then the latest past semester. Unfinished past-semester assignments remain visible. Calendar and Today follow actual dates across semesters. Routine classes are hidden from Calendar and included in Today. Exam styling includes an icon and label as well as red color. Course deletion removes its events after confirmation. Semester deletion requires an empty semester.
