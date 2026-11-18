import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { makeRedirectUri } from "expo-auth-session";
import { isRunningInExpoGo } from "expo";
import * as WebBrowser from "expo-web-browser";
import { Session } from "@supabase/supabase-js";
import { getGoogleOAuthUrl, supabase } from "../data/supabase";
import { getExpoGoRedirectError } from "../data/authRedirect";

WebBrowser.maybeCompleteAuthSession();
const exchanges = new Map<string, Promise<void>>();
export function finishOAuth(url: string): Promise<void> {
  const parsed = new URL(url);
  const error = parsed.searchParams.get("error_description");
  if (error) return Promise.reject(new Error(error));
  const code = parsed.searchParams.get("code");
  if (!code)
    return Promise.reject(
      new Error(
        "Sign-in did not return an authorization code. Please try again.",
      ),
    );
  if (!exchanges.has(code)) {
    const exchange = supabase!.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) throw error;
      });
    exchanges.set(code, exchange);
    void exchange.catch(() => {
      exchanges.delete(code);
    });
  }
  return exchanges.get(code)!;
}

const AuthContext = createContext<{
  session: Session | null;
  loading: boolean;
  signingIn: boolean;
  callbackUrl: string;
  redirectError: string | null;
  error: string | null;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}>(null!);
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const signInPending = useRef(false);
  const expoGo = Platform.OS !== "web" && isRunningInExpoGo();
  const callbackUrl =
    Platform.OS === "web"
      ? typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : ""
      : expoGo
        ? makeRedirectUri({ path: "auth/callback" })
        : "assignr://auth/callback";
  const redirectError = expoGo ? getExpoGoRedirectError(callbackUrl) : null;
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        setSession(data.session);
        setLoading(false);
      })
      .catch((e) => {
        if (alive) {
          setError(String(e));
          setLoading(false);
        }
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setSession(session);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  async function signIn() {
    if (signInPending.current) return;
    if (!supabase)
      throw new Error("Connect a Supabase project to enable Google sign-in.");
    signInPending.current = true;
    setSigningIn(true);
    setError(null);
    try {
      if (redirectError) throw new Error(redirectError);
      const redirectTo = callbackUrl;
      if (__DEV__ && Platform.OS !== "web") {
        console.info(
          `[Assignr auth] Add this exact URL in Supabase → Authentication → URL Configuration → Redirect URLs: ${redirectTo}`,
        );
      }
      const authorizationUrl = await getGoogleOAuthUrl(redirectTo);
      if (Platform.OS === "web") {
        window.location.assign(authorizationUrl);
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(
        authorizationUrl,
        redirectTo,
      );
      if (result.type === "success") await finishOAuth(result.url);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not sign in. Please try again.",
      );
    } finally {
      signInPending.current = false;
      setSigningIn(false);
    }
  }
  async function signOut() {
    const { error } = await supabase!.auth.signOut({ scope: "local" });
    if (error) throw error;
  }
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signingIn,
        callbackUrl,
        redirectError,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
