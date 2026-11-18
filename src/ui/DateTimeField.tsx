import { createElement } from "react";
import { View } from "react-native";
import { Text, Icon, IconButton } from "./primitives";
import { format, parseISO } from "date-fns";
import { useTheme } from "./theme";

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
  if (compact)
    return (
      <View
        testID="form-field"
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexShrink: 0,
          gap: 2,
        }}
      >
        <View
          style={{
            position: "relative",
            height: 44,
            minWidth: value ? 88 : 40,
            paddingHorizontal: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            borderRadius: 8,
            backgroundColor: value ? t.surface : "transparent",
          }}
        >
          <Icon
            name="calendar-blank-outline"
            size={17}
            color={value ? t.accent : t.muted}
          />
          {value ? (
            <Text muted style={{ fontSize: 12 }}>
              {format(parseISO(value), "MMM d")}
            </Text>
          ) : null}
          {createElement("input", {
            type: mode,
            "aria-label": label,
            value,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              onChangeText(e.target.value),
            onClick: (e: React.MouseEvent<HTMLInputElement>) => {
              try {
                e.currentTarget.showPicker();
              } catch {}
            },
            style: {
              position: "absolute",
              inset: 0,
              opacity: 0,
              width: "100%",
              height: "100%",
              cursor: "pointer",
              colorScheme: t.dark ? "dark" : "light",
            },
          })}
        </View>
        {value && onClear ? (
          <IconButton
            icon="calendar-remove-outline"
            label={`Clear ${label.toLowerCase()}`}
            onPress={onClear}
          />
        ) : null}
      </View>
    );
  return (
    <View testID="form-field" style={{ flexShrink: 0, minWidth: 0, gap: 6 }}>
      <Text muted style={{ fontSize: 12, fontWeight: "500" }}>
        {label}
      </Text>
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
          minHeight: 44,
          padding: 11,
          borderRadius: 10,
          border: "1px solid transparent",
          background: t.surface,
          color: t.text,
          colorScheme: t.dark ? "dark" : "light",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          outlineColor: t.accent,
          fontSize: 16,
        },
      })}
    </View>
  );
}
