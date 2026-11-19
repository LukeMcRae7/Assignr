import { displayDate, isDate } from "./dates";
import {
  CLASS_KINDS,
  EventKind,
  Preferences,
  StudyEvent,
  Subtask,
} from "./model";

export type EventContext =
  "assignments" | "assessments" | "classes" | "general";
export const kindLabels: Record<EventKind, string> = {
  assignment: "Assignment",
  exam: "Exam",
  quiz: "Quiz",
  lecture: "Lecture",
  tutorial: "Tutorial",
  lab: "Lab",
  seminar: "Seminar",
  activity: "Event",
};
export function contextForKind(kind: EventKind): EventContext {
  return kind === "assignment"
    ? "assignments"
    : kind === "exam" || kind === "quiz"
      ? "assessments"
      : CLASS_KINDS.includes(kind)
        ? "classes"
        : "general";
}
export function editorKinds(
  context: EventContext,
  existingKind?: EventKind,
): EventKind[] {
  const kinds: EventKind[] =
    context === "assignments"
      ? ["assignment"]
      : context === "assessments"
        ? ["exam", "quiz"]
        : context === "classes"
          ? ["lecture", "tutorial", "lab"]
          : [
              "assignment",
              "exam",
              "quiz",
              "lecture",
              "tutorial",
              "lab",
              "activity",
            ];
  return existingKind && !kinds.includes(existingKind)
    ? [...kinds, existingKind]
    : kinds;
}
export type EventCategory = Exclude<EventContext, "general">;

export function categoryForKind(kind: EventKind): EventCategory {
  const context = contextForKind(kind);
  return context === "general" ? "classes" : context;
}

export function typeLabel(event: Pick<StudyEvent, "custom_type" | "kind">) {
  return event.custom_type || kindLabels[event.kind];
}

export function typeKey(event: Pick<StudyEvent, "custom_type" | "kind">) {
  return event.custom_type
    ? categoryForKind(event.kind) + ":" + event.custom_type.trim().toLowerCase()
    : event.kind;
}

export function usedTypes(events: StudyEvent[]) {
  const types = new Map<string, StudyEvent>();
  for (const event of events) {
    if (!event.deleted_at && !event.cancelled) types.set(typeKey(event), event);
  }
  return [...types.values()].sort((a, b) =>
    typeLabel(a).localeCompare(typeLabel(b)),
  );
}

export function customTypeName(
  name: string,
  kind: EventKind,
  events: StudyEvent[],
) {
  const label = name.trim().replace(/\s+/g, " ");
  if (!label) throw new Error("Give this type a name.");
  if (label.length > 40)
    throw new Error("Keep the type name under 41 characters.");
  const category = categoryForKind(kind);
  const key = typeKey({ kind, custom_type: label });
  const reserved = editorKinds(category).map((k) => kindLabels[k]);
  if (
    [...reserved, "Other"].some((s) => s.toLowerCase() === label.toLowerCase())
  )
    throw new Error("This type already has its own button.");
  return (
    usedTypes(events).find((e) => typeKey(e) === key)?.custom_type || label
  );
}

export function calendarVisible(event: StudyEvent, preferences: Preferences) {
  if (event.custom_type)
    return (
      preferences.custom_type_visibility?.[typeKey(event)] ??
      categoryForKind(event.kind) !== "classes"
    );
  return preferences.calendar_types.includes(event.kind);
}

export function subtaskDate(subtask: Subtask, zone: string): string | null {
  if (subtask.target_date !== undefined) return subtask.target_date;
  if (!subtask.target_at || Number.isNaN(Date.parse(subtask.target_at)))
    return null;
  const date = displayDate(subtask.target_at, zone, "yyyy-MM-dd");
  return isDate(date) ? date : null;
}
export function normalizeSubtasks(
  subtasks: Subtask[],
  zone: string,
): Subtask[] {
  return subtasks.map((subtask) => ({
    id: subtask.id,
    title: subtask.title,
    completed: subtask.completed,
    target_date: subtaskDate(subtask, zone),
  }));
}
