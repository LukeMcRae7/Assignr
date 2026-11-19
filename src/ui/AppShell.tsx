import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { Link, Slot, usePathname } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useWorkspace } from "../providers/WorkspaceProvider";
import { useAuth } from "../providers/AuthProvider";
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Sheet,
  Text,
} from "./primitives";
import { blend, useTheme } from "./theme";

const items = [
  { href: "/", name: "ToDo", icon: "clipboard-list-outline" },
  { href: "/calendar", name: "Calendar", icon: "calendar-blank-outline" },
  { href: "/courses", name: "Courses", icon: "school-outline" },
  { href: "/today", name: "Today", icon: "clock-outline" },
  { href: "/settings", name: "Settings", icon: "cog-outline" },
] as const;
export function AppShell() {
  const t = useTheme();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [collapsed, setCollapsed] = useState(false);
  const rail = wide && collapsed;
  const insets = useSafeAreaInsets();
  const w = useWorkspace();
  const { session } = useAuth();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: wide ? "row-reverse" : "column",
        backgroundColor: t.background,
      }}
    >
      <View style={{ flex: 1 }}>
        <StatusBanner />
        <Slot />
      </View>
      <SafeAreaView
        edges={wide ? ["top", "left", "bottom"] : ["left", "right"]}
        style={{
          width: rail ? 72 : wide ? 204 : "100%",
          backgroundColor: t.subtle,
          borderRightWidth: wide ? 1 : 0,
          borderTopWidth: wide ? 0 : 1,
          borderColor: t.border,
          paddingHorizontal: rail ? 8 : wide ? 14 : 7,
          paddingTop: wide ? 18 : 5,
          paddingBottom: wide ? 22 : Math.max(insets.bottom, 6),
          gap: wide ? 32 : 0,
        }}
      >
        {wide ? (
          <View
            style={{
              paddingLeft: rail ? 3 : 0,
              flexDirection: "row",
              alignItems: "center",
              gap: 11,
            }}
          >
            <IconButton
              icon={rail ? "menu" : "menu-open"}
              label={rail ? "Expand sidebar" : "Collapse sidebar"}
              onPress={() => setCollapsed(!collapsed)}
            />
            {!rail ? (
              <View
                style={{
                  width: 31,
                  height: 33,
                  borderRadius: 9,
                  backgroundColor: t.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="check" color="#FFF" size={23} />
              </View>
            ) : null}
            {!rail ? (
              <Text
                style={{ fontWeight: "700", fontSize: 20, letterSpacing: -0.7 }}
              >
                Assignr
              </Text>
            ) : null}
          </View>
        ) : null}
        <View
          accessibilityLabel="Main navigation"
          style={{ flexDirection: wide ? "column" : "row", gap: wide ? 7 : 0 }}
        >
          {items.map((item) => {
            const selected =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} replace asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected }}
                  aria-current={selected ? "page" : undefined}
                  style={{
                    flex: wide ? undefined : 1,
                    flexDirection: wide ? "row" : "column",
                    alignItems: "center",
                    justifyContent: wide && !rail ? "flex-start" : "center",
                    gap: wide ? 13 : 3,
                    minHeight: 46,
                    paddingHorizontal: wide && !rail ? 14 : 0,
                    borderRadius: 10,
                    backgroundColor: selected
                      ? wide
                        ? t.elevated
                        : blend(t.accent, t.background, 0.16)
                      : "transparent",
                  }}
                >
                  <View
                    style={{
                      minWidth: wide ? 24 : 44,
                      height: wide ? 28 : 25,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon
                      name={item.icon}
                      size={wide ? 22 : 20}
                      color={selected ? t.accent : t.muted}
                    />
                  </View>
                  {!rail ? (
                    <Text
                      style={{
                        fontSize: wide ? 14 : 10,
                        fontWeight: selected ? "600" : "400",
                        color: selected ? t.accent : t.muted,
                        lineHeight: wide ? 23 : 16,
                      }}
                    >
                      {item.name}
                    </Text>
                  ) : null}
                </Pressable>
              </Link>
            );
          })}
        </View>
        {wide && !rail ? (
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              gap: 9,
              paddingHorizontal: 12,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 9 }}
            >
              <Icon
                name={session ? "cloud-check-outline" : "check-circle-outline"}
                size={17}
              />
              <Text muted style={{ fontSize: 12 }}>
                {session
                  ? w.status === "synced"
                    ? "All changes synced"
                    : "Your student space"
                  : "Saved on this device"}
              </Text>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
export function StatusBanner() {
  const w = useWorkspace();
  const t = useTheme();
  if (!w.error && w.status !== "offline" && !w.notice) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: t.elevated,
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Icon
        name={
          w.notice || w.error ? "alert-circle-outline" : "cloud-off-outline"
        }
        size={18}
      />
      <Text style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>
        {w.notice ||
          (w.status === "offline"
            ? "You’re offline. Changes are saved here and will sync when you reconnect."
            : "Could not sync. Your changes are saved on this device.")}
      </Text>
      {w.error ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void w.store.sync();
          }}
          style={{ padding: 8 }}
        >
          <Text style={{ color: t.accent, fontSize: 12 }}>Retry</Text>
        </Pressable>
      ) : w.notice ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss message"
          onPress={() => w.setNotice(null)}
        >
          <Icon name="close" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}
export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const w = useWorkspace();
  const t = useTheme();
  if (!w.ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {w.error ? (
          <EmptyState
            title="Could not open your workspace"
            description={w.error}
            action={
              <Button
                onPress={() => {
                  void w.store.initialize();
                }}
              >
                Try again
              </Button>
            }
          />
        ) : (
          <ActivityIndicator color={t.accent} />
        )}
      </View>
    );
  return (
    <>
      {children}
      {w.conflict ? (
        <Sheet visible title="Changed on another device" onClose={() => {}}>
          <Text>
            This item has another saved version. Your edits are safe on this
            device.
          </Text>
          <Text muted style={{ fontSize: 13 }}>
            Choose which version to keep for “
            {"title" in w.conflict.mutation.record
              ? w.conflict.mutation.record.title
              : "name" in w.conflict.mutation.record
                ? w.conflict.mutation.record.name
                : "Settings"}
            ”.
          </Text>
          <Button
            onPress={() => {
              void w.perform(() => w.store.resolveConflict("mine"));
            }}
          >
            Keep my edits
          </Button>
          <Button
            variant="secondary"
            onPress={() => {
              void w.perform(() => w.store.resolveConflict("remote"));
            }}
          >
            Use the synced version
          </Button>
        </Sheet>
      ) : null}
    </>
  );
}
