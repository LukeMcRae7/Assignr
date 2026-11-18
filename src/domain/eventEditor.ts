import { displayDate, isDate } from "./dates";
import { CLASS_KINDS, EventKind, Subtask } from "./model";

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
