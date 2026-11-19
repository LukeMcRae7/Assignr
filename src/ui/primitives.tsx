import {
  Children,
  ComponentProps,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
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
  Keyboard,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { controls, useTheme } from "./theme";

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
  compact = false,
  label,
}: PropsWithChildren<{
  onPress(): void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: string;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  label?: string;
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
      accessibilityLabel={label}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight:
          compact && Platform.OS === "web"
            ? controls.desktopHeight
            : controls.height,
        flexShrink: 0,
        borderRadius: controls.radius,
        paddingHorizontal: compact ? 12 : 16,
        paddingVertical: compact ? 6 : 10,
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
  hideLabel = false,
  prominent = false,
  outlined = false,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  hideLabel?: boolean;
  prominent?: boolean;
  outlined?: boolean;
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View testID="form-field" style={{ gap: 6, flexShrink: 0, minWidth: 0 }}>
      {!hideLabel ? (
        <Text muted style={{ fontSize: 12, fontWeight: "500" }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={t.muted}
        selectionColor={t.accent}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        underlineColorAndroid="transparent"
        style={[
          {
            borderWidth: 1,
            borderColor: prominent
              ? "transparent"
              : focused
                ? t.accent
                : outlined
                  ? t.border
                  : "transparent",
            borderRadius: controls.radius,
            color: t.text,
            backgroundColor: prominent ? "transparent" : t.surface,
            minHeight: controls.height,
            padding: prominent ? 0 : 11,
            fontSize: prominent ? 25 : 15,
            fontWeight: prominent ? "600" : "400",
            ...(Platform.OS === "web"
              ? { outlineWidth: 0, outlineStyle: "solid" as const }
              : {}),
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
  label,
}: PropsWithChildren<{
  selected?: boolean;
  onPress?(): void;
  color?: string;
  label?: string;
}>) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={
        onPress
          ? () => {
              Keyboard.dismiss();
              onPress();
            }
          : undefined
      }
      style={{
        borderWidth: 1,
        borderColor: selected ? color || t.accent : "transparent",
        backgroundColor: selected ? t.elevated : "transparent",
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 9,
        minHeight: 40,
        flexShrink: 0,
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
  aside,
  fluid = false,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  floating?: ReactNode;
  refresh?: ReactNode;
  aside?: ReactNode;
  fluid?: boolean;
}>) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const split = width >= 1100 && !!aside;
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: t.background }}
    >
      <View style={{ flex: 1, flexDirection: "row", minHeight: 0 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            testID="screen-header"
            style={{
              width: "100%",
              maxWidth: split || fluid ? undefined : 1114,
              alignSelf: "center",
              paddingHorizontal: width >= 900 ? 32 : 20,
              paddingTop: 16,
              paddingBottom: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={{
                  fontSize: width >= 900 ? 34 : width < 360 ? 28 : 32,
                  lineHeight: 44,
                  fontWeight: "700",
                  letterSpacing: -0.8,
                }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text muted style={{ fontSize: 13 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                flexShrink: 0,
              }}
            >
              {actions}
            </View>
          </View>
          <ScrollView
            style={{ flex: 1, minWidth: 0 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingHorizontal: width >= 900 ? 32 : 20,
              paddingBottom: 100,
              flexGrow: 1,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: fluid ? undefined : 1050,
                alignSelf: "center",
                gap: 24,
              }}
            >
              {refresh}
              {children}
            </View>
          </ScrollView>
        </View>
        {aside ? (
          <View
            testID="screen-aside"
            style={
              split
                ? {
                    width: Math.min(460, width * 0.3),
                    paddingTop: 16,
                    minHeight: 0,
                    marginRight: 24,
                    marginLeft: 8,
                    paddingBottom: 24,
                  }
                : { position: "absolute", width: 0, height: 0 }
            }
          >
            {aside}
          </View>
        ) : null}
      </View>
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
  description?: string;
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
      {description ? (
        <Text
          muted
          style={{ maxWidth: 320, textAlign: "center", marginBottom: 8 }}
        >
          {description}
        </Text>
      ) : null}
      {action}
    </View>
  );
}
export type FormPresentation = "dialog" | "panel" | "inline";
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
  action,
  error,
  presentation = "dialog",
  large = false,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose(): void;
  footer?: ReactNode;
  action?: ReactNode;
  error?: string;
  presentation?: FormPresentation;
  large?: boolean;
}>) {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const frame = useRef<View>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const inline = presentation === "inline" && width >= 1100;
  const side = presentation === "panel" && width >= 1100;
  const mobile = width < 700;
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const previous = document.activeElement as HTMLElement | null;
    const root = frame.current as unknown as HTMLElement | null;
    const timer = setTimeout(
      () =>
        !inline &&
        root
          ?.querySelector<HTMLElement>(
            mobile ? '[role="button"]' : 'input,textarea,button,[tabindex="0"]',
          )
          ?.focus(),
      0,
    );
    const key = (event: KeyboardEvent) => {
      if (inline) {
        if (event.key === "Escape" && root?.contains(document.activeElement)) {
          event.preventDefault();
          closeRef.current();
        }
        return;
      }
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== root) return;
      if (event.key === "Tab" && root) {
        const elements = Array.from(
          root.querySelectorAll<HTMLElement>(
            'input,textarea,button,[tabindex="0"]',
          ),
        ).filter(
          (el) =>
            el.getAttribute("aria-disabled") !== "true" &&
            !el.hasAttribute("disabled") &&
            el.getBoundingClientRect().height > 0,
        );
        const first = elements[0],
          last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [visible, inline, mobile]);
  if (!visible) return null;
  const content = (
    <SafeAreaView
      ref={frame}
      role={inline ? undefined : "dialog"}
      aria-modal={!inline || undefined}
      accessibilityLabel={title}
      accessibilityViewIsModal={!inline}
      edges={mobile ? ["bottom"] : []}
      testID="form-surface"
      style={{
        backgroundColor: t.background,
        width: "100%",
        maxWidth: inline || side ? undefined : large ? 640 : 540,
        maxHeight: height - (mobile ? 44 : 64),
        height: inline || side ? height - 64 : undefined,
        borderRadius: inline ? 14 : side ? 0 : 18,
        overflow: "hidden",
        borderWidth: mobile ? 0 : 1,
        borderColor: t.border,
        flexShrink: 1,
        minHeight: 0,
      }}
    >
      <View
        testID="form-header"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
          flexShrink: 0,
          borderBottomWidth: 1,
          borderColor: t.border,
        }}
      >
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{ fontSize: 16, fontWeight: "600", flex: 1 }}
        >
          {title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {action}
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>
      </View>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{
            color: t.danger,
            fontSize: 13,
            paddingHorizontal: 20,
            paddingVertical: 8,
            flexShrink: 0,
          }}
        >
          {error}
        </Text>
      ) : null}
      <ScrollView
        testID="form-body"
        style={{
          flexShrink: 1,
          flexGrow: inline || side ? 1 : 0,
          minHeight: 0,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        onTouchStart={(e) => {
          if (e.target === e.currentTarget) Keyboard.dismiss();
        }}
        contentContainerStyle={{ padding: 20, flexGrow: 0 }}
      >
        <View
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) Keyboard.dismiss();
          }}
          style={{ gap: controls.formGap, flexShrink: 0 }}
        >
          {children}
        </View>
      </ScrollView>
      {footer ? (
        <View
          style={{
            padding: 12,
            flexDirection: "row",
            justifyContent: "flex-end",
            flexShrink: 0,
            borderTopWidth: 1,
            borderColor: t.border,
          }}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
  if (inline) return content;
  return (
    <Modal
      visible
      transparent
      animationType={t.reduceMotion ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "#00000060",
          justifyContent: mobile ? "flex-end" : "center",
          alignItems: side ? "flex-end" : "center",
          padding: mobile || side ? 0 : 24,
        }}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        {side ? (
          <View
            style={{
              width: 460,
              maxWidth: "100%",
              height: "100%",
              justifyContent: "center",
            }}
          >
            {content}
          </View>
        ) : (
          content
        )}
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
export function FormRow({ children }: PropsWithChildren) {
  return (
    <View testID="form-row" style={formRow}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={{ flex: 1, minWidth: 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
export const errorStyle: TextStyle = { fontSize: 14, lineHeight: 20 };
