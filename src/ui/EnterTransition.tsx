import { PropsWithChildren, useEffect, useState } from "react";
import { Animated, Easing, Platform, ViewStyle } from "react-native";
import { useTheme } from "./theme";

export function EnterTransition({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  const { reduceMotion } = useTheme();
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 155,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
