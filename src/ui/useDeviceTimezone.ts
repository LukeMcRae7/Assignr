import { useEffect, useReducer } from "react";
import { AppState, Platform } from "react-native";
import { getCalendars, useCalendars } from "expo-localization";
import { isTimezone } from "../domain/dates";

function readTimezone() {
  const native = getCalendars()[0]?.timeZone;
  if (native && isTimezone(native)) return native;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function useDeviceTimezone() {
  useCalendars();
  const [, refresh] = useReducer((revision: number) => revision + 1, 0);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    if (Platform.OS === "web") window.addEventListener("focus", refresh);
    return () => {
      subscription.remove();
      if (Platform.OS === "web") window.removeEventListener("focus", refresh);
    };
  }, []);
  return readTimezone();
}
