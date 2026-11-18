export function getExpoGoRedirectError(callbackUrl: string): string | null {
  const { hostname } = new URL(callbackUrl);
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  const ipv6 = hostname.startsWith("[") && hostname.endsWith("]");
  const loopback = ipv4 ? hostname.startsWith("127.") : hostname === "[::1]";
  // Supabase rejects non-loopback IP literals before checking its redirect allowlist.
  if (((ipv4 || ipv6) && !loopback) || /^\d+$/.test(hostname)) {
    return "Supabase cannot return to this IP-based Expo Go address. Stop Expo and run npm run start:go, then scan the new QR code.";
  }
  return null;
}
