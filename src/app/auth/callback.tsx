import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { finishOAuth } from "../../providers/AuthProvider";
import { Button, EmptyState, Screen } from "../../ui/primitives";
export default function CallbackRoute() {
  const { code, error_description } = useLocalSearchParams<{
    code?: string;
    error_description?: string;
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    async function finish() {
      try {
        if (error_description) throw new Error(error_description);
        if (!code)
          throw new Error("The sign-in link is missing. Please try again.");
        await finishOAuth(
          `assignr://auth/callback?code=${encodeURIComponent(code)}`,
        );
        if (alive) router.replace("/");
      } catch (e) {
        if (alive)
          setError(
            e instanceof Error ? e.message : "Could not finish sign-in.",
          );
      }
    }
    void finish();
    return () => {
      alive = false;
    };
  }, [code, error_description]);
  return (
    <Screen title="Signing in">
      <EmptyState
        icon="account-circle-outline"
        title={error ? "Could not sign in" : "Opening your workspace"}
        description={error || "Just a moment…"}
        action={
          error ? (
            <Button onPress={() => router.replace("/")}>Try again</Button>
          ) : undefined
        }
      />
    </Screen>
  );
}
