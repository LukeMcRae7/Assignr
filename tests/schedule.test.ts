import { calendarDays } from "../src/domain/calendar";
import { defaultPreferences } from "../src/domain/model";
import { test } from "node:test";
import assert from "node:assert/strict";
import { StudyEvent } from "../src/domain/model";
import {
  assignmentsByDueDate,
  buildTimeline,
  occurrencesOnDate,
} from "../src/domain/schedule";
import { zonedISO } from "../src/domain/dates";
import { validateEvent } from "../src/domain/validation";

export function event(overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "lecture",
    user_id: "user",
    version: 0,
    deleted_at: null,
    course_id: null,
    title: "Lecture",
    kind: "lecture",
    starts_at: null,
    ends_at: null,
    due_at: null,
    location: "",
    notes: "",
    priority: null,
    completed: false,
    subtasks: [],
    recurrence: null,
    parent_event_id: null,
    occurrence_date: null,
    cancelled: false,
    ...overrides,
  };
}
const recurring = event({
  recurrence: {
    days: [1],
    start_date: "2026-01-01",
    end_date: "2026-05-01",
    start_time: "09:30",
    end_time: "10:30",
    timezone: "America/Vancouver",
  },
});
test("calendar indexes each visible day and excludes a midnight ending from the next day", () => {
  const event = {
    ...recurring,
    kind: "quiz" as const,
    custom_type: "Presentation",
    recurrence: null,
    starts_at: "2026-03-02T18:00:00Z",
    ends_at: "2026-03-04T00:00:00Z",
  };
  const p = {
    ...defaultPreferences("local"),
    timezone: "UTC",
    calendar_types: [],
  };
  assert.deepEqual(
    [...calendarDays([event], "2026-03-01", 7, p).keys()],
    ["2026-03-02", "2026-03-03"],
  );
  assert.equal(
    calendarDays([event], "2026-03-01", 7, {
      ...p,
      custom_type_visibility: { "assessments:presentation": false },
    }).size,
    0,
  );
});
test("weekly classes keep campus wall time across daylight saving", () => {
  assert.equal(
    occurrencesOnDate([recurring], "2026-03-02", "America/Vancouver")[0]
      .starts_at,
    "2026-03-02T17:30:00.000Z",
  );
  assert.equal(
    occurrencesOnDate([recurring], "2026-03-09", "America/Vancouver")[0]
      .starts_at,
    "2026-03-09T16:30:00.000Z",
  );
  assert.equal(
    occurrencesOnDate([recurring], "2026-05-04", "America/Vancouver").length,
    0,
  );
});
test("an in-class exam replaces only its linked occurrence", () => {
  const exam = event({
    id: "exam",
    kind: "exam",
    title: "Midterm",
    starts_at: "2026-03-09T16:30:00.000Z",
    ends_at: "2026-03-09T17:30:00.000Z",
    parent_event_id: "lecture",
    occurrence_date: "2026-03-09",
  });
  const unrelated = { ...recurring, id: "other" };
  assert.deepEqual(
    occurrencesOnDate(
      [recurring, exam, unrelated],
      "2026-03-09",
      "America/Vancouver",
    )
      .map((o) => o.event.id)
      .sort(),
    ["exam", "other"],
  );
  assert.equal(
    occurrencesOnDate([recurring, exam], "2026-03-16", "America/Vancouver")[0]
      .event.id,
    "lecture",
  );
});
test("a cancelled or rescheduled occurrence does not leave a duplicate", () => {
  const cancelled = event({
    id: "skip",
    parent_event_id: "lecture",
    occurrence_date: "2026-03-09",
    cancelled: true,
  });
  assert.equal(
    occurrencesOnDate([recurring, cancelled], "2026-03-09", "America/Vancouver")
      .length,
    0,
  );
  const moved = {
    ...cancelled,
    cancelled: false,
    starts_at: "2026-03-10T17:00:00.000Z",
    ends_at: "2026-03-10T18:00:00.000Z",
  };
  assert.equal(
    occurrencesOnDate([recurring, moved], "2026-03-09", "America/Vancouver")
      .length,
    0,
  );
  assert.equal(
    occurrencesOnDate([recurring, moved], "2026-03-10", "America/Vancouver")[0]
      .event.id,
    "skip",
  );
});
test("breaks use the end of all overlapping events", () => {
  const events = [
    ["a", "09:00", "12:00"],
    ["b", "10:00", "11:00"],
    ["c", "13:00", "14:00"],
  ].map(([id, start, end]) =>
    event({
      id,
      starts_at: zonedISO("2026-11-16", start, "UTC"),
      ends_at: zonedISO("2026-11-16", end, "UTC"),
    }),
  );
  const breaks = buildTimeline(
    occurrencesOnDate(events, "2026-11-16", "UTC"),
  ).filter((r) => r.type === "break");
  assert.equal(breaks.length, 1);
  assert.equal(breaks[0].minutes, 60);
});
test("standalone assignments sort by full due timestamp and hide completed", () => {
  const a = event({
    id: "a",
    kind: "assignment",
    due_at: "2026-11-17T01:00:00.000Z",
  });
  const b = { ...a, id: "b", due_at: "2026-11-16T20:00:00.000Z" };
  assert.deepEqual(
    assignmentsByDueDate([a, b, { ...a, id: "done", completed: true }]).map(
      (e) => e.id,
    ),
    ["b", "a"],
  );
  assert.equal(
    occurrencesOnDate([a], "2026-11-16", "America/Vancouver").length,
    1,
  );
});
test("invalid local times and reversed ranges cannot be saved", () => {
  assert.throws(() => zonedISO("2026-03-08", "02:30", "America/Vancouver"));
  assert.match(
    validateEvent({
      ...recurring,
      recurrence: { ...recurring.recurrence!, end_time: "08:30" },
    })!,
    /end time/,
  );
});
