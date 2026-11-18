import { ComponentProps, PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text as NativeText,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
  useWindowDimensions,
  KeyboardAvoidingView,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "./theme";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export function Icon({
  name,
  size = 22,
  color,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: ComponentProps<typeof MaterialCommunityIcons>["style"];
}) {
  const t = useTheme();
  return (
    <MaterialCommunityIcons
      aria-hidden
      accessible={false}
      name={name as IconName}
      size={size}
      color={color || t.muted}
      style={style}
    />
  );
}
export function Text({
  children,
  style,
  muted = false,
  ...props
}: ComponentProps<typeof NativeText> & { muted?: boolean }) {
  const t = useTheme();
  return (
    <NativeText
      {...props}
      style={[
        { color: muted ? t.muted : t.text, fontSize: 16, lineHeight: 23 },
        style,
      ]}
    >
      {children}
    </NativeText>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
  selected,
  disabled,
}: {
  icon: string;
  label: string;
  onPress(): void;
  selected?: boolean;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      aria-pressed={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected || pressed ? t.elevated : "transparent",
        opacity: disabled ? 0.35 : 1,
      })}
    >
      <Icon name={icon} color={selected ? t.accent : t.muted} />
    </Pressable>
  );
}
export function Button({
  children,
  onPress,
  variant = "primary",
  icon,
  disabled,
  busy,
}: PropsWithChildren<{
  onPress(): void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: string;
  disabled?: boolean;
  busy?: boolean;
}>) {
  const t = useTheme();
  const color =
    variant === "primary"
      ? "#FFFFFF"
      : variant === "danger"
        ? t.danger
        : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        backgroundColor:
          variant === "primary"
            ? t.accent
            : variant === "secondary"
              ? t.elevated
              : "transparent",
        opacity: disabled || busy ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : icon ? (
        <Icon name={icon} color={color} size={20} />
      ) : null}
      <Text style={{ fontWeight: "600", color }}>{children}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 7, flexGrow: 1, flexBasis: 0, minWidth: 100 }}>
      <Text style={{ fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={t.muted}
        selectionColor={t.accent}
        style={[
          {
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 10,
            color: t.text,
            backgroundColor: t.surface,
            minHeight: 48,
            padding: 12,
            fontSize: 16,
          },
          style,
        ]}
      />
      {hint ? (
        <Text muted style={{ fontSize: 12, lineHeight: 17 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
export function Chip({
  children,
  selected,
  onPress,
  color,
}: PropsWithChildren<{
  selected?: boolean;
  onPress?(): void;
  color?: string;
}>) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: selected ? color || t.accent : t.border,
        backgroundColor: selected ? t.elevated : "transparent",
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 20,
        minHeight: 40,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "500",
          color: selected ? color || t.accent : t.muted,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Panel({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 16,
          padding: 20,
          gap: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function SectionTitle({
  children,
  right,
}: PropsWithChildren<{ right?: ReactNode }>) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 21, fontWeight: "600", lineHeight: 28 }}>
        {children}
      </Text>
      {right}
    </View>
  );
}
export function Screen({
  title,
  subtitle,
  actions,
  children,
  floating,
  refresh,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  floating?: ReactNode;
  refresh?: ReactNode;
}>) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: t.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: width >= 900 ? 40 : 20,
          paddingBottom: 110,
          flexGrow: 1,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 1050,
            alignSelf: "center",
            gap: 28,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              paddingTop: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: width >= 900 ? 38 : 32,
                  lineHeight: 46,
                  fontWeight: "700",
                  letterSpacing: -1,
                }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text muted style={{ marginTop: 4, fontSize: 14 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              {actions}
            </View>
          </View>
          {refresh}
          {children}
        </View>
      </ScrollView>
      {floating ? (
        <View style={{ position: "absolute", right: 24, bottom: 24 }}>
          {floating}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
export function Fab({
  onPress,
  label = "Add event",
}: {
  onPress(): void;
  label?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 58,
        height: 58,
        backgroundColor: t.accent,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.8 : 1,
        boxShadow: "0 4px 16px #00000020",
      })}
    >
      <Icon name="plus" size={32} color="#FFF" />
    </Pressable>
  );
}
export function EmptyState({
  icon = "notebook-outline",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 48,
        paddingHorizontal: 16,
        gap: 13,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 22,
          backgroundColor: t.elevated,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 5,
        }}
      >
        <Icon name={icon} size={32} color={t.accent} />
      </View>
      <Text
        style={{
          fontSize: 22,
          lineHeight: 28,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        muted
        style={{ maxWidth: 320, textAlign: "center", marginBottom: 8 }}
      >
        {description}
      </Text>
      {action}
    </View>
  );
}
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose(): void;
  footer?: ReactNode;
}>) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "#00000080",
          justifyContent: width >= 700 ? "center" : "flex-end",
          alignItems: "center",
        }}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView
          edges={["bottom"]}
          style={{
            backgroundColor: t.background,
            width: "100%",
            maxWidth: 620,
            maxHeight: "94%",
            borderRadius: width >= 700 ? 22 : 22,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 24,
              paddingRight: 12,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderColor: t.border,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{ fontSize: 22, fontWeight: "600" }}
            >
              {title}
            </Text>
            <IconButton icon="close" label="Close" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, gap: 22 }}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              style={{ padding: 20, borderTopWidth: 1, borderColor: t.border }}
            >
              {footer}
            </View>
          ) : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Confirm({
  title,
  message,
  onCancel,
  onConfirm,
  busy,
}: {
  title: string;
  message: string;
  onCancel(): void;
  onConfirm(): void;
  busy?: boolean;
}) {
  return (
    <Sheet visible title={title} onClose={onCancel}>
      <Text muted>{message}</Text>
      <Button variant="danger" onPress={onConfirm} busy={busy}>
        Delete
      </Button>
      <Button variant="secondary" onPress={onCancel}>
        Keep it
      </Button>
    </Sheet>
  );
}
export const formRow: ViewStyle = {
  flexDirection: "row",
  gap: 12,
  alignItems: "flex-start",
};
export const errorStyle: TextStyle = { fontSize: 14, lineHeight: 20 };
