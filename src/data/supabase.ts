import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { createClient, processLock } from "@supabase/supabase-js";
import { Entity, Snapshot, Table } from "../domain/model";
import { ConflictError, Remote } from "./store";
import { createNativeOAuthUrl } from "./pkce";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const cloudConfigured = !!url && !!key && !url.includes("your-project");
const authStorageKey = url
  ? `sb-${new URL(url).hostname.split(".")[0]}-auth-token`
  : "assignr-auth";

// Chunk sessions because provider tokens can exceed an individual SecureStore value.
const secureStorage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.count`));
    if (!count) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}.${i}`),
      ),
    );
    return parts.every((p) => p !== null)
      ? decodeURIComponent(parts.join(""))
      : null;
  },
  async setItem(key: string, value: string) {
    const encoded = encodeURIComponent(value);
    const previous = Number(await SecureStore.getItemAsync(`${key}.count`));
    const count = Math.ceil(encoded.length / 1000);
    await SecureStore.deleteItemAsync(`${key}.count`);
    for (let i = 0; i < count; i++)
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        encoded.slice(i * 1000, (i + 1) * 1000),
      );
    await SecureStore.setItemAsync(`${key}.count`, String(count));
    for (let i = count; i < previous; i++)
      await SecureStore.deleteItemAsync(`${key}.${i}`);
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.count`));
    await SecureStore.deleteItemAsync(`${key}.count`);
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(`${key}.${i}`),
      ),
    );
  },
};

export const supabase = cloudConfigured
  ? createClient(url!, key!, {
      auth: {
        storageKey: authStorageKey,
        ...(Platform.OS !== "web"
          ? { storage: secureStorage, lock: processLock }
          : {}),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;

export async function getGoogleOAuthUrl(redirectTo: string): Promise<string> {
  if (!supabase)
    throw new Error("Connect a Supabase project to enable Google sign-in.");
  if (Platform.OS !== "web") {
    return createNativeOAuthUrl({
      projectUrl: url!,
      redirectTo,
      storage: secureStorage,
      storageKey: authStorageKey,
      randomBytes: () => Crypto.getRandomBytesAsync(32),
      sha256Base64: (value) =>
        Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value, {
          encoding: Crypto.CryptoEncoding.BASE64,
        }),
    });
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  if (!data.url)
    throw new Error("Google sign-in did not return a sign-in address.");
  return data.url;
}

if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase!.auth.startAutoRefresh();
    else supabase!.auth.stopAutoRefresh();
  });
}

interface Row {
  id: string;
  user_id: string;
  version: number;
  deleted_at: string | null;
  payload: Record<string, unknown>;
}
const decode = (row: Row): Entity =>
  ({
    ...row.payload,
    id: row.id,
    user_id: row.user_id,
    version: row.version,
    deleted_at: row.deleted_at,
  }) as Entity;
export function createRemote(userId: string): Remote {
  const client = supabase!;
  return {
    async pull() {
      const snapshot: Snapshot = {
        semesters: [],
        courses: [],
        events: [],
        preferences: [],
      };
      await Promise.all(
        (Object.keys(snapshot) as Table[]).map(async (table) => {
          const rows: Entity[] = [];
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await client
              .from(table)
              .select("id,user_id,version,deleted_at,payload")
              .eq("user_id", userId)
              .order("id")
              .range(offset, offset + 499);
            if (error) throw error;
            rows.push(...(data as Row[]).map(decode));
            if (data.length < 500) break;
          }
          Object.assign(snapshot, { [table]: rows });
        }),
      );
      return snapshot;
    },
    async apply(mutation) {
      const { data, error } = await client.rpc("apply_change", {
        p_table: mutation.table,
        p_record: mutation.record,
        p_expected_version: mutation.expected_version,
        p_mutation_id: mutation.id,
      });
      if (error?.code === "40001")
        throw new ConflictError("This item changed on another device.");
      if (error) throw error;
      return decode(data as Row);
    },
    async get(table, id) {
      const { data, error } = await client
        .from(table)
        .select("id,user_id,version,deleted_at,payload")
        .eq("user_id", userId)
        .eq("id", id)
        .single();
      if (error) throw error;
      return decode(data as Row);
    },
  };
}
