import { ReactNode, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { COURSE_COLORS } from "../../domain/model";
import { isTime, displayWallTime } from "../../domain/dates";
import { useAuth } from "../../providers/AuthProvider";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import {
  Button,
  Chip,
  Icon,
  Screen,
  SectionTitle,
  Sheet,
  Text,
} from "../../ui/primitives";
import { DateTimeField } from "../../ui/DateTimeField";
import { useTheme } from "../../ui/theme";

function Setting({
  icon,
  title,
  description,
  control,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  control?: ReactNode;
  onPress?(): void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingVertical: 16,
      }}
    >
      <Icon name={icon} size={24} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text>{title}</Text>
        <Text muted style={{ fontSize: 13, lineHeight: 19 }}>
          {description}
        </Text>
      </View>
      {control}
    </Pressable>
  );
}
export function SettingsScreen() {
  const {
    preferences: p,
    updatePreferences,
    perform,
    status,
    queue,
    store,
  } = useWorkspace();
  const { session, signOut } = useAuth();
  const t = useTheme();
  const [sheet, setSheet] = useState<"accent" | "time" | "signout" | null>(
    null,
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const update = (patch: Parameters<typeof updatePreferences>[0]) => {
    void perform(() => updatePreferences(patch));
  };
  const toggle = (
    label: string,
    value: boolean,
    onValueChange: (v: boolean) => void,
  ) => (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: t.accent, false: t.elevated }}
    />
  );
  return (
    <Screen title="Settings">
      <View style={{ gap: 30, maxWidth: 750 }}>
        <View style={{ gap: 14 }}>
          <SectionTitle>Appearance</SectionTitle>
          <View style={{ flexDirection: "row", gap: 9 }}>
            {(["system", "light", "dark"] as const).map((theme) => (
              <Chip
                key={theme}
                selected={p.theme === theme}
                onPress={() => update({ theme })}
              >
                {theme === "system"
                  ? "Follow system"
                  : theme === "light"
                    ? "Light"
                    : "Dark"}
              </Chip>
            ))}
          </View>
          <Setting
            icon="palette-outline"
            title="Accent color"
            description="A little color, your way"
            onPress={() => setSheet("accent")}
            control={
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: p.accent,
                  borderWidth: 2,
                  borderColor: t.border,
                }}
              />
            }
          />
        </View>
        <View>
          <SectionTitle>Calendar settings</SectionTitle>
          <Setting
            icon="star-outline"
            title="Highlight exams"
            description="Make exam dates easy to recognize"
            control={toggle(
              "Highlight exams",
              p.highlight_exams,
              (highlight_exams) => update({ highlight_exams }),
            )}
          />
        </View>
        <View>
          <SectionTitle>Time settings</SectionTitle>
          <Setting
            icon="clock-outline"
            title="Use 24-hour time"
            description="Display 13:30 instead of 1:30 PM"
            control={toggle("Use 24-hour time", p.hour24, (hour24) =>
              update({ hour24 }),
            )}
          />
          <Setting
            icon="clock-end"
            title="Default due time"
            description="For new assignments"
            onPress={() => {
              setValue(p.default_due_time);
              setError("");
              setSheet("time");
            }}
            control={
              <Text muted style={{ fontSize: 14 }}>
                {displayWallTime(p.default_due_time, p.hour24)}
              </Text>
            }
          />
        </View>
        <View>
          <SectionTitle>Account</SectionTitle>
          <Setting
            icon={session ? "account-circle-outline" : "cellphone-check"}
            title={
              session?.user.user_metadata.full_name ||
              (session ? "Your account" : "On this device")
            }
            description={
              session?.user.email ||
              "Your workspace is saved locally on this device."
            }
          />
          {session ? (
            <>
              <Setting
                icon="cloud-check-outline"
                title={
                  status === "synced"
                    ? "Everything is up to date"
                    : status === "offline"
                      ? "You’re offline"
                      : queue.length
                        ? `${queue.length} changes waiting to sync`
                        : "Sync across devices"
                }
                description={
                  status === "offline"
                    ? "Your changes will sync when you reconnect."
                    : "Your courses and plans follow you."
                }
              />
              <Button
                variant="secondary"
                icon="sync"
                onPress={() => {
                  void store.sync();
                }}
              >
                Sync now
              </Button>
              <Button variant="ghost" onPress={() => setSheet("signout")}>
                Sign out
              </Button>
            </>
          ) : (
            <Text muted style={{ fontSize: 13 }}>
              Google sign-in and device sync are available when cloud services
              are connected.
            </Text>
          )}
        </View>
        <Text muted style={{ fontSize: 12, marginTop: 12 }}>
          Assignr · A little structure for student life.
        </Text>
      </View>
      {sheet === "accent" ? (
        <Sheet visible title="Accent color" onClose={() => setSheet(null)}>
          <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
            {["#2798EE", ...COURSE_COLORS].map((accent) => (
              <Pressable
                key={accent}
                accessibilityRole="button"
                accessibilityLabel={`Accent ${accent}`}
                accessibilityState={{ selected: p.accent === accent }}
                onPress={() => {
                  update({ accent });
                  setSheet(null);
                }}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {p.accent === accent ? (
                  <Icon name="check" color="#FFF" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Sheet>
      ) : null}
      {sheet === "time" ? (
        <Sheet visible title="Default due time" onClose={() => setSheet(null)}>
          <DateTimeField
            label="Default due time"
            mode="time"
            value={value}
            onChangeText={setValue}
          />
          {error ? <Text style={{ color: t.danger }}>{error}</Text> : null}
          <Button
            onPress={() => {
              if (!isTime(value)) {
                setError("Choose a valid time.");
                return;
              }
              update({ default_due_time: value });
              setSheet(null);
            }}
          >
            Save
          </Button>
        </Sheet>
      ) : null}
      {sheet === "signout" ? (
        <Sheet visible title="Sign out?" onClose={() => setSheet(null)}>
          <Text muted>
            {queue.length
              ? "You have changes waiting to sync. Sync them before signing out so they are available on your other devices."
              : "Your synced courses and events will be here when you sign in again."}
          </Text>
          {queue.length ? (
            <Button
              onPress={() => {
                void store.sync();
                setSheet(null);
              }}
            >
              Sync changes
            </Button>
          ) : (
            <Button
              variant="secondary"
              onPress={() => {
                void perform(signOut);
              }}
            >
              Sign out of this device
            </Button>
          )}
          <Button variant="ghost" onPress={() => setSheet(null)}>
            Stay signed in
          </Button>
        </Sheet>
      ) : null}
    </Screen>
  );
}
