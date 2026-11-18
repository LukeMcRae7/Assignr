interface PkceOptions {
  projectUrl: string;
  redirectTo: string;
  storageKey: string;
  storage: { setItem(key: string, value: string): Promise<void> };
  randomBytes(): Promise<Uint8Array>;
  sha256Base64(value: string): Promise<string>;
}

export const toBase64Url = (value: string) =>
  value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Native Expo provides secure random bytes and SHA-256 without a global WebCrypto shim.
export async function createNativeOAuthUrl(
  options: PkceOptions,
): Promise<string> {
  const bytes = await options.randomBytes();
  if (bytes.length < 32 || bytes.length > 64)
    throw new Error("Invalid PKCE random byte length.");
  const verifier = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const challenge = toBase64Url(await options.sha256Base64(verifier));
  // Supabase v2 reads this JSON-encoded entry when exchangeCodeForSession is called.
  await options.storage.setItem(
    `${options.storageKey}-code-verifier`,
    JSON.stringify(verifier),
  );
  const url = new URL(
    `${options.projectUrl.replace(/\/$/, "")}/auth/v1/authorize`,
  );
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", options.redirectTo);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "s256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}
