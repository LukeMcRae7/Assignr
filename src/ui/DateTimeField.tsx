import { createElement } from "react";
import { View } from "react-native";
import { Text } from "./primitives";
import { useTheme } from "./theme";

export interface DateTimeFieldProps {
  label: string;
  value: string;
  mode: "date" | "time";
  onChangeText(value: string): void;
  hint?: string;
  placeholder?: string;
}

export function DateTimeField({
  mode,
  label,
  value,
  onChangeText,
}: DateTimeFieldProps) {
  const t = useTheme();
  return (
    <View style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, gap: 7 }}>
      <Text style={{ fontSize: 13, fontWeight: "600" }}>{label}</Text>
      {createElement("input", {
        type: mode,
        "aria-label": label,
        value,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          onChangeText(event.target.value),
        style: {
          boxSizing: "border-box",
          width: "100%",
          minWidth: 0,
          minHeight: 48,
          padding: 12,
          borderRadius: 10,
          border: `1px solid ${t.border}`,
          background: t.surface,
          color: t.text,
          colorScheme: t.dark ? "dark" : "light",
          fontFamily: "inherit",
          fontSize: 16,
        },
      })}
    </View>
  );
}
