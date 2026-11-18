import { isDate, isTime, isTimezone } from "./dates";
import { Course, StudyEvent } from "./model";

export function validateCourse(course: Course): string | null {
  if (!course.name.trim()) return "Give your course a name.";
  if (course.name.length > 120)
    return "Keep the course name under 120 characters.";
  if (course.website && !/^https?:\/\/[^\s]+$/i.test(course.website))
    return "Enter a full website URL starting with https://.";
  return null;
}
export function validateEvent(event: StudyEvent): string | null {
  if (!event.title.trim()) return "Give your event a title.";
  if (event.title.length > 180) return "Keep the title under 180 characters.";
  if (event.recurrence) {
    const r = event.recurrence;
    if (
      !r.days.length ||
      r.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    )
      return "Choose at least one weekday.";
    if (
      !isDate(r.start_date) ||
      !isDate(r.end_date) ||
      r.end_date < r.start_date
    )
      return "Enter a valid term start and end date.";
    if (!isTimezone(r.timezone))
      return "Choose a valid timezone, such as America/Vancouver.";
    if (
      !isTime(r.start_time) ||
      !isTime(r.end_time) ||
      r.end_time <= r.start_time
    )
      return "The class end time must be after its start time on the same day.";
    if (event.parent_event_id) return "A replacement cannot repeat.";
  } else if (event.starts_at) {
    if (
      !event.ends_at ||
      Date.parse(event.ends_at) <= Date.parse(event.starts_at)
    )
      return "The end time must be after the start time.";
  } else if (!event.due_at) return "Choose a due time or a start and end time.";
  if (event.kind === "assignment" && (!event.due_at || event.recurrence))
    return "Assignments need a due date and time.";
  if (event.subtasks.some((s) => !s.title.trim()))
    return "Give each subtask a title or remove it.";
  if (
    event.subtasks.some(
      (s) => s.target_at && !/^\d{4}-\d{2}-\d{2}T/.test(s.target_at),
    )
  )
    return "Enter subtask targets as YYYY-MM-DD HH:MM, or leave them empty.";
  if (
    event.subtasks.some(
      (s) => s.target_at && event.due_at && s.target_at > event.due_at,
    )
  )
    return "Subtask targets must be before the assignment is due.";
  if (event.parent_event_id && !isDate(event.occurrence_date || ""))
    return "Choose the original class date.";
  return null;
}
