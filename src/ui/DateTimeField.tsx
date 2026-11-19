import { createElement, useState } from "react";
import { View } from "react-native";
import { Text, Icon, IconButton } from "./primitives";
import { format, parseISO } from "date-fns";
import { useTheme } from "./theme";

import { displayWallTime, isDate, isTime } from "../domain/dates";
import { useWorkspace } from "../providers/WorkspaceProvider";

export interface DateTimeFieldProps {
  label: string;
  value: string;
  mode: "date" | "time";
  onChangeText(value: string): void;
  hint?: string;
  placeholder?: string;
  compact?: boolean;
  onClear?(): void;
}

export function DateTimeField({
  mode,
  label,
  value,
  onChangeText,
  compact = false,
  onClear,
}: DateTimeFieldProps) {
  const t = useTheme();
  const { preferences } = useWorkspace();
  const [focused, setFocused] = useState(false);
  const [nativeInput, setNativeInput] = useState(false);
  const text =
    mode === "date" && isDate(value)
      ? format(parseISO(value), compact ? "MMM d" : "MMM d, yyyy")
      : mode === "time" && isTime(value)
        ? displayWallTime(value, preferences.hour24)
        : "";
  return (
    <View testID="form-field" style={{ gap: 6, minWidth: 0, flexShrink: 0 }}>
      {!compact ? (
        <Text muted style={{ fontSize: 12, fontWeight: "500" }}>
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        <View
          style={{
            minHeight: 44,
            minWidth: compact ? 40 : 0,
            flex: compact ? undefined : 1,
            borderRadius: 10,
            borderColor: focused ? t.accent : "transparent",
            borderWidth: 1,
            paddingHorizontal: compact ? 7 : 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            justifyContent: compact ? "center" : "space-between",
            backgroundColor: compact && !value ? "transparent" : t.surface,
          }}
        >
          {text || !compact ? (
            <Text
              numberOfLines={1}
              style={{ fontSize: compact ? 12 : 14, flexShrink: 1 }}
            >
              {text || (mode === "date" ? "Select date" : "Select time")}
            </Text>
          ) : null}
          <Icon
            name={mode === "date" ? "calendar-blank-outline" : "clock-outline"}
            size={17}
            color={compact && value ? t.accent : t.muted}
          />
          {createElement("input", {
            type: mode,
            value,
            "aria-label": label,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              onChangeText(e.target.value),
            onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
              setFocused(true);
              setNativeInput(e.currentTarget.matches(":focus-visible"));
            },
            onBlur: () => {
              setFocused(false);
              setNativeInput(false);
            },
            onClick: (e: React.MouseEvent<HTMLInputElement>) => {
              try {
                e.currentTarget.showPicker();
                setNativeInput(false);
              } catch {
                setNativeInput(true);
              }
            },
            style: {
              position: "absolute",
              inset: 0,
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
              minWidth: 0,
              opacity: nativeInput ? 1 : 0,
              cursor: "pointer",
              colorScheme: t.dark ? "dark" : "light",
              background: t.surface,
              color: t.text,
              border: 0,
              borderRadius: 10,
              fontFamily: "system-ui",
              fontSize: 14,
            },
          })}
        </View>
        {compact && value && onClear ? (
          <IconButton
            icon="calendar-remove-outline"
            label={"Clear " + label.toLowerCase()}
            onPress={onClear}
          />
        ) : null}
      </View>
    </View>
  );
}
