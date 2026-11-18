import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import type { DateTimeFieldProps } from "./DateTimeField";
import { Button, Icon, Text } from "./primitives";
import { useTheme } from "./theme";

export function DateTimeField({
  label,
  value,
  mode,
  onChangeText,
  hint,
}: DateTimeFieldProps) {
  const t = useTheme();
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
    if (Platform.OS === "android")
      DateTimePickerAndroid.open({
        value: selected,
        mode,
        is24Hour: true,
        onValueChange: (_event, date) => change(date),
      });
    else setOpen(!open);
  }
  return (
    <View style={{ flexGrow: 1, flexBasis: 0, minWidth: 100, gap: 7 }}>
      <Text style={{ fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={show}
        style={{
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 10,
          backgroundColor: t.surface,
          padding: 12,
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text>{value}</Text>
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
        <View>
          <DateTimePicker
            value={selected}
            mode={mode}
            display="spinner"
            themeVariant={t.dark ? "dark" : "light"}
            onValueChange={(_event, date) => change(date)}
          />
          <Button variant="ghost" onPress={() => setOpen(false)}>
            Done
          </Button>
        </View>
      ) : null}
    </View>
  );
}
