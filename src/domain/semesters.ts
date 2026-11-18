import { dayKey, isDate, isTimezone } from "./dates";
import { CLASS_KINDS, Course, Semester, StudyEvent } from "./model";

export function validateSemester(semester: Semester): string | null {
  if (!semester.name.trim() || semester.name.length > 120)
    return "Give your semester a name under 120 characters.";
  if (!isDate(semester.start_date) || !isDate(semester.end_date))
    return "Choose valid teaching dates.";
  if (semester.end_date < semester.start_date)
    return "The teaching end date must follow the start date.";
  if (!isTimezone(semester.timezone))
    return "Your device timezone could not be read. Check your device settings.";
  return null;
}

export function semesterStatus(semester: Semester, now = new Date()) {
  const today = dayKey(now, semester.timezone);
  return today < semester.start_date
    ? "Upcoming"
    : today > semester.end_date
      ? "Past"
      : "Current";
}

export function defaultSemester(semesters: Semester[], now = new Date()) {
  const active = semesters.filter((s) => !s.deleted_at);
  const latest = (a: Semester, b: Semester) =>
    b.start_date.localeCompare(a.start_date) || a.id.localeCompare(b.id);
  return (
    active
      .filter((s) => semesterStatus(s, now) === "Current")
      .sort(latest)[0] ||
    active
      .filter((s) => semesterStatus(s, now) === "Upcoming")
      .sort((a, b) => -latest(a, b))[0] ||
    active.sort(latest)[0] ||
    null
  );
}

// Old rules remain intact until their course is explicitly assigned a semester.
export function resolveSemesterEvents(
  events: StudyEvent[],
  courses: Course[],
  semesters: Semester[],
): StudyEvent[] {
  return events.map((event) => {
    if (!event.recurrence || !CLASS_KINDS.includes(event.kind)) return event;
    const course = courses.find(
      (c) => c.id === event.course_id && !c.deleted_at,
    );
    const semester = semesters.find(
      (s) => s.id === course?.semester_id && !s.deleted_at,
    );
    return semester
      ? {
          ...event,
          recurrence: {
            ...event.recurrence,
            start_date: semester.start_date,
            end_date: semester.end_date,
            timezone: semester.timezone,
          },
        }
      : event;
  });
}

export function exceptionsOutsideSemester(
  semester: Semester,
  courses: Course[],
  events: StudyEvent[],
) {
  const ids = new Set(
    courses
      .filter((c) => c.semester_id === semester.id && !c.deleted_at)
      .map((c) => c.id),
  );
  return events.filter(
    (e) =>
      !e.deleted_at &&
      e.course_id &&
      ids.has(e.course_id) &&
      e.parent_event_id &&
      e.occurrence_date &&
      (e.occurrence_date < semester.start_date ||
        e.occurrence_date > semester.end_date),
  );
}
