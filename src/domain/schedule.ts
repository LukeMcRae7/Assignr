import { addDateDays, dayKey, weekday, zonedISO } from "./dates";
import { Occurrence, StudyEvent } from "./model";

const timestamp = (item: Occurrence) => item.starts_at || item.due_at || "";

// Replacements are resolved before visibility filters so a hidden exam cannot resurrect its lecture.
export function expandEvents(
  events: StudyEvent[],
  from: Date,
  until: Date,
): Occurrence[] {
  const active = events.filter((e) => !e.deleted_at);
  const overrides = new Set(
    active
      .filter((e) => e.parent_event_id && e.occurrence_date)
      .map((e) => `${e.parent_event_id}:${e.occurrence_date}`),
  );
  const result: Occurrence[] = [];
  const inRange = (iso: string) =>
    iso >= from.toISOString() && iso < until.toISOString();
  for (const event of active) {
    if (event.cancelled) continue;
    if (event.recurrence) {
      const r = event.recurrence;
      let date = dayKey(from, r.timezone);
      const last = dayKey(until, r.timezone);
      if (date < r.start_date) date = r.start_date;
      for (; date <= last && date <= r.end_date; date = addDateDays(date, 1)) {
        if (
          !r.days.includes(weekday(date)) ||
          overrides.has(`${event.id}:${date}`)
        )
          continue;
        // A skipped DST wall time has no occurrence; other dates still expand.
        let start: string;
        let end: string;
        try {
          start = zonedISO(date, r.start_time, r.timezone);
          end = zonedISO(date, r.end_time, r.timezone);
        } catch {
          continue;
        }
        if (end > from.toISOString() && start < until.toISOString())
          result.push({
            key: `${event.id}:${date}`,
            event,
            starts_at: start,
            ends_at: end,
            due_at: null,
            original_date: date,
          });
      }
    } else {
      const point = event.starts_at || event.due_at;
      if (
        point &&
        (inRange(point) ||
          (event.starts_at &&
            event.ends_at &&
            event.ends_at > from.toISOString() &&
            event.starts_at < until.toISOString()))
      ) {
        result.push({
          key: event.id,
          event,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
          due_at: event.due_at,
          original_date: event.occurrence_date,
        });
      }
    }
  }
  return result.sort(
    (a, b) =>
      timestamp(a).localeCompare(timestamp(b)) ||
      a.event.title.localeCompare(b.event.title),
  );
}

export function occurrencesOnDate(
  events: StudyEvent[],
  date: string,
  zone: string,
): Occurrence[] {
  return expandEvents(
    events,
    new Date(zonedISO(date, "00:00", zone)),
    new Date(zonedISO(addDateDays(date, 1), "00:00", zone)),
  );
}

export type TimelineItem =
  | { type: "event"; occurrence: Occurrence }
  | { type: "break"; starts_at: string; ends_at: string; minutes: number };
export function buildTimeline(occurrences: Occurrence[]): TimelineItem[] {
  const timed = occurrences
    .filter((o) => o.starts_at && o.ends_at)
    .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!));
  const rows: TimelineItem[] = [];
  let latestEnd: string | null = null;
  for (const occurrence of timed) {
    if (latestEnd && occurrence.starts_at! > latestEnd) {
      const minutes =
        (Date.parse(occurrence.starts_at!) - Date.parse(latestEnd)) / 60000;
      if (minutes >= 10)
        rows.push({
          type: "break",
          starts_at: latestEnd,
          ends_at: occurrence.starts_at!,
          minutes,
        });
    }
    rows.push({ type: "event", occurrence });
    if (!latestEnd || occurrence.ends_at! > latestEnd)
      latestEnd = occurrence.ends_at;
  }
  return rows;
}

export const assignmentsByDueDate = (
  events: StudyEvent[],
  includeCompleted = false,
) =>
  events
    .filter(
      (e) =>
        !e.deleted_at &&
        !e.cancelled &&
        e.kind === "assignment" &&
        (includeCompleted || !e.completed),
    )
    .sort(
      (a, b) =>
        (a.due_at || "9999").localeCompare(b.due_at || "9999") ||
        a.title.localeCompare(b.title),
    );
export const subtaskProgress = (event: StudyEvent) =>
  event.subtasks.length
    ? event.subtasks.filter((s) => s.completed).length / event.subtasks.length
    : 0;
