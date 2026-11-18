import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const dayKey = (date: Date, zone: string) =>
  formatInTimeZone(date, zone, "yyyy-MM-dd");
export const addDateDays = (date: string, days: number) =>
  format(addDays(parseISO(date), days), "yyyy-MM-dd");
export const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).getUTCDay();
export function zonedISO(date: string, time: string, zone: string): string {
  const parsed = fromZonedTime(`${date}T${time}:00`, zone);
  if (
    Number.isNaN(parsed.getTime()) ||
    formatInTimeZone(parsed, zone, "yyyy-MM-dd HH:mm") !== `${date} ${time}`
  ) {
    throw new Error(
      "This local time does not exist in the selected timezone. Choose another time.",
    );
  }
  return parsed.toISOString();
}
export const displayTime = (iso: string, zone: string, hour24 = false) =>
  formatInTimeZone(iso, zone, hour24 ? "HH:mm" : "h:mm a");
export const displayDate = (iso: string, zone: string, pattern = "MMM d") =>
  formatInTimeZone(iso, zone, pattern);
export function isDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export const isTime = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function displayWallTime(time: string, hour24 = false): string {
  if (hour24) return time;
  const [hour, minute] = time.split(":");
  const h = Number(hour);
  return `${h % 12 || 12}:${minute} ${h < 12 ? "AM" : "PM"}`;
}
export function isTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
