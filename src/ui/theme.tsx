import { createContext, PropsWithChildren, useContext } from "react";
import { useColorScheme } from "react-native";
import { useWorkspace } from "../providers/WorkspaceProvider";

export const palette = {
  dark: {
    background: "#111111",
    surface: "#1E1E1E",
    elevated: "#262626",
    text: "#ECEBED",
    muted: "#AAA8B1",
    border: "#3E3D42",
    subtle: "#181818",
    danger: "#F06B70",
    success: "#65C78C",
  },
  light: {
    background: "#FAFAF9",
    surface: "#FFFFFF",
    elevated: "#EEEDEA",
    text: "#252429",
    muted: "#77757E",
    border: "#DEDDDF",
    subtle: "#F2F1EF",
    danger: "#CE444B",
    success: "#268651",
  },
};
const ThemeContext = createContext({
  ...palette.light,
  dark: false,
  accent: "#2798EE",
});
export function ThemeProvider({ children }: PropsWithChildren) {
  const { preferences } = useWorkspace();
  const system = useColorScheme();
  const dark =
    preferences.theme === "dark" ||
    (preferences.theme === "system" && system === "dark");
  return (
    <ThemeContext.Provider
      value={{
        ...(dark ? palette.dark : palette.light),
        dark,
        accent: preferences.accent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export function blend(hex: string, base: string, ratio: number): string {
  const channel = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16);
  return (
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(channel(hex, i) * ratio + channel(base, i) * (1 - ratio))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export const space = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 40 };
export const radius = { small: 8, medium: 14, large: 20 };
