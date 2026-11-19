import { PropsWithChildren, useEffect, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { useTheme } from "./theme";

export function Disclosure({
  open,
  children,
}: PropsWithChildren<{ open: boolean }>) {
  const { reduceMotion } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const [rendered, setRendered] = useState(open);
  const [height, setHeight] = useState(0);
  if (open && !rendered) setRendered(true);
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(open ? 1 : 0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished && !open) setRendered(false);
    });
    return () => animation.stop();
  }, [open, progress, reduceMotion]);
  if (reduceMotion) return open ? <View>{children}</View> : null;
  if (!rendered && !open) return null;
  return (
    <Animated.View
      aria-hidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      pointerEvents={open ? "auto" : "none"}
      style={{
        overflow: "hidden",
        height: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, height],
        }),
        opacity: progress,
      }}
    >
      <View
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        style={{ position: "absolute", left: 0, right: 0, top: 0 }}
      >
        {children}
      </View>
    </Animated.View>
  );
}
