import { addDateDays, dayKey, zonedISO } from "./dates";
import { calendarVisible } from "./eventEditor";
import { Occurrence, Preferences, StudyEvent } from "./model";
import { expandEvents } from "./schedule";

export function calendarDays(
  events: StudyEvent[],
  gridStart: string,
  days: number,
  preferences: Preferences,
) {
  const end = addDateDays(gridStart, days);
  const occurrences = expandEvents(
    events,
    new Date(zonedISO(gridStart, "00:00", preferences.timezone)),
    new Date(zonedISO(end, "00:00", preferences.timezone)),
  );
  const result = new Map<string, Occurrence[]>();
  for (const item of occurrences) {
    if (item.event.completed || !calendarVisible(item.event, preferences))
      continue;
    const first = dayKey(
      new Date(item.starts_at || item.due_at!),
      preferences.timezone,
    );
    const last = item.ends_at
      ? dayKey(new Date(Date.parse(item.ends_at) - 1), preferences.timezone)
      : first;
    for (
      let date = first < gridStart ? gridStart : first;
      date <= last && date < end;
      date = addDateDays(date, 1)
    ) {
      const items = result.get(date) || [];
      items.push(item);
      result.set(date, items);
    }
  }
  return result;
}
