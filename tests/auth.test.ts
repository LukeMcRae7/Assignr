import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createNativeOAuthUrl, toBase64Url } from "../src/data/pkce";
import { getExpoGoRedirectError } from "../src/data/authRedirect";

const digest = async (value: string) =>
  createHash("sha256").update(value).digest("base64");

test("Expo Go rejects LAN and public IP callbacks before opening Google", () => {
  assert.match(
    getExpoGoRedirectError("exp://192.168.1.95:8081/--/auth/callback")!,
    /npm run start:go/,
  );
  assert.ok(getExpoGoRedirectError("exp://203.0.113.1:8081/--/auth/callback"));
  assert.ok(getExpoGoRedirectError("exp://[fd00::1]:8081/--/auth/callback"));
});

test("Expo Go allows tunnel hostnames and loopback simulator callbacks", () => {
  assert.equal(
    getExpoGoRedirectError("exp://test-8081.exp.direct/--/auth/callback"),
    null,
  );
  assert.equal(
    getExpoGoRedirectError("exps://test-8081.exp.direct/--/auth/callback"),
    null,
  );
  assert.equal(
    getExpoGoRedirectError("exp://127.0.0.1:8081/--/auth/callback"),
    null,
  );
  assert.equal(
    getExpoGoRedirectError("exp://[::1]:8081/--/auth/callback"),
    null,
  );
});

test("S256 matches the RFC 7636 example", async () => {
  assert.equal(
    toBase64Url(await digest("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("native OAuth preserves the exact Expo Go callback and uses S256 without WebCrypto", async () => {
  const saved = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: undefined,
  });
  try {
    const redirectTo = "exp://192.168.1.20:8081/--/auth/callback";
    const result = await createNativeOAuthUrl({
      projectUrl: "https://test.supabase.co",
      redirectTo,
      storageKey: "auth-test",
      storage: {
        async setItem(key, value) {
          saved.set(key, value);
        },
      },
      randomBytes: async () => randomBytes(32),
      sha256Base64: digest,
    });
    const url = new URL(result);
    const verifier: string = JSON.parse(saved.get("auth-test-code-verifier")!);
    assert.match(verifier, /^[0-9a-f]{64}$/);
    assert.equal(url.searchParams.get("redirect_to"), redirectTo);
    assert.equal(url.searchParams.get("code_challenge_method"), "s256");
    assert.equal(
      url.searchParams.get("code_challenge"),
      toBase64Url(await digest(verifier)),
    );
    assert.equal(url.searchParams.has("code_verifier"), false);
    assert.equal(url.searchParams.get("provider"), "google");
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else Reflect.deleteProperty(globalThis, "crypto");
  }
});

test("Supabase SDK exchanges the native-generated verifier and persists the session", async () => {
  const saved = new Map<string, string>();
  const storage = {
    async getItem(key: string) {
      return saved.get(key) || null;
    },
    async setItem(key: string, value: string) {
      saved.set(key, value);
    },
    async removeItem(key: string) {
      saved.delete(key);
    },
  };
  await createNativeOAuthUrl({
    projectUrl: "https://test.supabase.co",
    redirectTo: "assignr://auth/callback",
    storageKey: "native-exchange-test",
    storage,
    randomBytes: async () => randomBytes(32),
    sha256Base64: digest,
  });
  const expectedVerifier = JSON.parse(
    saved.get("native-exchange-test-code-verifier")!,
  );
  let sentVerifier: string | undefined;
  const client = createClient(
    "https://test.supabase.co",
    "test-publishable-key",
    {
      auth: {
        storage,
        storageKey: "native-exchange-test",
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
      global: {
        fetch: async (input, init) => {
          assert.equal(
            String(input),
            "https://test.supabase.co/auth/v1/token?grant_type=pkce",
          );
          const body = JSON.parse(String(init?.body));
          assert.equal(body.auth_code, "test-authorization-code");
          sentVerifier = body.code_verifier;
          return new Response(
            JSON.stringify({
              access_token: "test-access-token",
              refresh_token: "test-refresh-token",
              token_type: "bearer",
              expires_in: 3600,
              user: {
                id: "11111111-1111-4111-8111-111111111111",
                aud: "authenticated",
                role: "authenticated",
                email: "test@example.com",
                app_metadata: {},
                user_metadata: {},
                created_at: new Date().toISOString(),
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        },
      },
    },
  );
  const result = await client.auth.exchangeCodeForSession(
    "test-authorization-code",
  );
  assert.equal(result.error, null);
  assert.equal(sentVerifier, expectedVerifier);
  assert.equal(result.data.session?.access_token, "test-access-token");
  assert.equal(saved.has("native-exchange-test-code-verifier"), false);
  assert.equal(
    JSON.parse(saved.get("native-exchange-test")!).access_token,
    "test-access-token",
  );
});

test("a verifier storage failure prevents the browser flow from starting", async () => {
  await assert.rejects(
    createNativeOAuthUrl({
      projectUrl: "https://test.supabase.co",
      redirectTo: "assignr://auth/callback",
      storageKey: "failed-storage",
      storage: {
        async setItem() {
          throw new Error("Storage unavailable");
        },
      },
      randomBytes: async () => randomBytes(32),
      sha256Base64: digest,
    }),
    /Storage unavailable/,
  );
});
