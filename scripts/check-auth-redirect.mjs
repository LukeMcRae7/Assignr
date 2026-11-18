import { createHash, randomBytes } from "node:crypto";

process.loadEnvFile(".env.local");
const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const requestedUrls = process.argv.slice(2);
if (!projectUrl || !requestedUrls.length) {
  process.stderr.write(
    "Usage: node scripts/check-auth-redirect.mjs <callback-url>\n",
  );
  process.exit(1);
}

for (const requested of requestedUrls) {
  try {
    const verifier = randomBytes(32).toString("hex");
    const authorize = new URL("/auth/v1/authorize", projectUrl);
    authorize.searchParams.set("provider", "google");
    authorize.searchParams.set("redirect_to", requested);
    authorize.searchParams.set(
      "code_challenge",
      createHash("sha256").update(verifier).digest("base64url"),
    );
    authorize.searchParams.set("code_challenge_method", "s256");
    const start = await fetch(authorize, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const providerLocation = start.headers.get("location");
    if (!providerLocation || start.status !== 302)
      throw new Error(`Authorization endpoint returned HTTP ${start.status}.`);
    const state = new URL(providerLocation).searchParams.get("state");
    if (!state) throw new Error("Provider redirect did not include state.");

    // Cancel only the diagnostic flow we just created; no Google login is performed.
    const cancelled = new URL("/auth/v1/callback", projectUrl);
    cancelled.searchParams.set("state", state);
    cancelled.searchParams.set("error", "access_denied");
    cancelled.searchParams.set(
      "error_description",
      "Assignr redirect diagnostic cancelled",
    );
    const result = await fetch(cancelled, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const location = result.headers.get("location");
    if (!location)
      throw new Error(`Callback endpoint returned HTTP ${result.status}.`);
    const returned = new URL(location);
    returned.search = "";
    returned.hash = "";
    process.stdout.write(
      JSON.stringify({
        requested,
        returned: returned.toString(),
        accepted: returned.toString() === new URL(requested).toString(),
      }) + "\n",
    );
  } catch (error) {
    process.stderr.write(
      JSON.stringify({
        requested,
        error:
          error instanceof Error ? error.message : "Redirect check failed.",
      }) + "\n",
    );
    process.exitCode = 1;
  }
}
