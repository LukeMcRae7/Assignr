import { useState } from "react";
import { Keyboard, Modal, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import type { DateTimeFieldProps } from "./DateTimeField";
import { Button, Icon, Text } from "./primitives";
import { useTheme } from "./theme";
import { useWorkspace } from "../providers/WorkspaceProvider";
import { displayWallTime } from "../domain/dates";

export function DateTimeField({
  label,
  value,
  mode,
  onChangeText,
  hint,
  compact = false,
  onClear,
}: DateTimeFieldProps) {
  const t = useTheme();
  const { preferences } = useWorkspace();
  const [open, setOpen] = useState(false);
  const parsed =
    mode === "date"
      ? new Date(`${value}T12:00:00`)
      : new Date(`2020-01-01T${value}:00`);
  const selected = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  function change(date: Date) {
    onChangeText(format(date, mode === "date" ? "yyyy-MM-dd" : "HH:mm"));
  }
  function show() {
    Keyboard.dismiss();
    if (Platform.OS === "android")
      DateTimePickerAndroid.open({
        value: selected,
        mode,
        is24Hour: preferences.hour24,
        onValueChange: (_event, date) => change(date),
      });
    else setOpen(!open);
  }
  return (
    <View testID="form-field" style={{ flexShrink: 0, minWidth: 0, gap: 6 }}>
      {!compact ? (
        <Text muted style={{ fontSize: 12, fontWeight: "500" }}>
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={show}
        style={{
          borderWidth: 1,
          borderColor: "transparent",
          borderRadius: 10,
          backgroundColor: t.surface,
          padding: compact ? 8 : 11,
          minHeight: 44,
          gap: 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {!compact || value ? (
          <Text style={{ fontSize: compact ? 12 : 15 }}>
            {mode === "date"
              ? format(selected, compact ? "MMM d" : "MMM d, yyyy")
              : displayWallTime(value, preferences.hour24)}
          </Text>
        ) : null}
        <Icon
          name={mode === "date" ? "calendar-blank-outline" : "clock-outline"}
          size={18}
        />
      </Pressable>
      {hint ? (
        <Text muted style={{ fontSize: 12, lineHeight: 17 }}>
          {hint}
        </Text>
      ) : null}
      {open ? (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "#00000060",
            }}
          >
            <Pressable
              accessibilityLabel="Dismiss picker"
              onPress={() => setOpen(false)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <SafeAreaView
              edges={["bottom"]}
              style={{
                backgroundColor: t.surface,
                padding: 16,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                alignItems: "stretch",
              }}
            >
              <Text style={{ fontWeight: "600" }}>{label}</Text>
              <DateTimePicker
                value={selected}
                mode={mode}
                display="spinner"
                themeVariant={t.dark ? "dark" : "light"}
                locale={
                  mode === "time"
                    ? preferences.hour24
                      ? "en-GB"
                      : "en-US"
                    : undefined
                }
                style={{ width: "100%", height: 216 }}
                onValueChange={(_event, date) => change(date)}
              />
              <Button variant="ghost" onPress={() => setOpen(false)}>
                Done
              </Button>
              {value && onClear ? (
                <Button
                  compact
                  variant="ghost"
                  onPress={() => {
                    onClear();
                    setOpen(false);
                  }}
                >
                  Clear date
                </Button>
              ) : null}
            </SafeAreaView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
