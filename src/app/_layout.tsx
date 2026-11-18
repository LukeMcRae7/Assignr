import { Stack, usePathname } from "expo-router";
import { ActivityIndicator, Platform, View } from "react-native";
import { isRunningInExpoGo } from "expo";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../providers/AuthProvider";
import { WorkspaceProvider } from "../providers/WorkspaceProvider";
import { ThemeProvider, useTheme } from "../ui/theme";
import { WorkspaceGuard } from "../ui/AppShell";
import { Button, EmptyState, Text } from "../ui/primitives";
import { cloudConfigured } from "../data/supabase";

function RootNavigator() {
  const t = useTheme();
  const auth = useAuth();
  const path = usePathname();
  if (auth.loading)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.background,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={t.accent} />
      </View>
    );
  if (cloudConfigured && !auth.session && path !== "/auth/callback")
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: t.background,
          padding: 24,
        }}
      >
        <EmptyState
          icon="school-outline"
          title="A little structure. A clearer day."
          description="Your classes, deadlines, and plans. Together in a space that follows you."
          action={
            <Button
              busy={auth.signingIn}
              disabled={!!auth.redirectError}
              onPress={() => {
                void auth.signIn();
              }}
              icon="google"
            >
              Continue with Google
            </Button>
          }
        />
        {__DEV__ && Platform.OS !== "web" && isRunningInExpoGo() ? (
          <View
            style={{
              gap: 10,
              alignSelf: "center",
              maxWidth: 380,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
              Expo Go sign-in setup
            </Text>
            {auth.redirectError ? (
              <Text style={{ fontSize: 13, lineHeight: 19, color: t.danger }}>
                {auth.redirectError}
              </Text>
            ) : (
              <Text muted style={{ fontSize: 13, lineHeight: 19 }}>
                Add this exact callback under Supabase → Authentication → URL
                Configuration → Redirect URLs, then sign in.
              </Text>
            )}
            <Text
              selectable
              style={{ fontSize: 12, lineHeight: 18, color: t.muted }}
            >
              {auth.callbackUrl}
            </Text>
          </View>
        ) : null}
        {auth.error ? (
          <Text
            accessibilityRole="alert"
            style={{ color: t.danger, textAlign: "center", marginTop: 16 }}
          >
            {auth.error}
          </Text>
        ) : null}
      </View>
    );
  return (
    <WorkspaceGuard>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="event/new"
          options={{
            presentation: "transparentModal",
            animation: "none",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{
            presentation: "transparentModal",
            animation: "none",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </Stack>
    </WorkspaceGuard>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
