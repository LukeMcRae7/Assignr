import { test } from "node:test";
import assert from "node:assert/strict";
import { Course, Semester, StudyEvent } from "../src/domain/model";
import {
  defaultSemester,
  exceptionsOutsideSemester,
  resolveSemesterEvents,
  semesterStatus,
  validateSemester,
} from "../src/domain/semesters";
import { occurrencesOnDate, weeklyScheduleLabel } from "../src/domain/schedule";

const base = { id: "semester", user_id: "alice", version: 1, deleted_at: null };
const semester: Semester = {
  ...base,
  name: "Spring 2027",
  start_date: "2027-01-04",
  end_date: "2027-04-16",
  timezone: "America/Vancouver",
};
const course: Course = {
  ...base,
  id: "course",
  semester_id: semester.id,
  name: "Algorithms",
  code: "CMPT 307",
  color: "#485BC4",
  icon: "server",
  professor: "",
  website: "",
  position: 0,
};
const lecture: StudyEvent = {
  ...base,
  id: "lecture",
  course_id: course.id,
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
  parent_event_id: null,
  occurrence_date: null,
  cancelled: false,
  recurrence: {
    days: [1],
    start_date: "2026-09-01",
    end_date: "2026-12-01",
    start_time: "09:30",
    end_time: "10:30",
    timezone: "America/Toronto",
  },
};

test("semester focus selects current, then next, then latest without mutating input", () => {
  const past = {
    ...semester,
    id: "past",
    start_date: "2026-09-01",
    end_date: "2026-12-01",
  };
  const next = {
    ...semester,
    id: "next",
    start_date: "2027-09-01",
    end_date: "2027-12-01",
  };
  const semesters = [past, next, semester];
  assert.equal(
    defaultSemester(semesters, new Date("2027-03-01T20:00Z"))?.id,
    semester.id,
  );
  assert.equal(
    defaultSemester(semesters, new Date("2026-12-20T20:00Z"))?.id,
    semester.id,
  );
  assert.equal(
    defaultSemester(semesters, new Date("2028-01-01T20:00Z"))?.id,
    next.id,
  );
  assert.equal(
    defaultSemester([{ ...semester, deleted_at: "2027-01-01" }]),
    null,
  );
  assert.deepEqual(
    semesters.map((s) => s.id),
    ["past", "next", "semester"],
  );
});

test("teaching boundaries are inclusive in the semester timezone", () => {
  assert.equal(
    semesterStatus(semester, new Date("2027-01-04T06:59Z")),
    "Upcoming",
  );
  assert.equal(
    semesterStatus(semester, new Date("2027-01-04T07:00Z")),
    "Current",
  );
  assert.equal(
    semesterStatus(semester, new Date("2027-04-17T06:59Z")),
    "Current",
  );
  assert.equal(semesterStatus(semester, new Date("2027-04-17T07:00Z")), "Past");
  assert.ok(validateSemester({ ...semester, end_date: "2027-02-30" }));
  assert.ok(validateSemester({ ...semester, end_date: "2026-12-01" }));
  assert.equal(validateSemester(semester), null);
});

test("mapped classes inherit teaching dates and timezone while unmapped and standalone schedules are preserved", () => {
  const effective = resolveSemesterEvents([lecture], [course], [semester])[0];
  assert.equal(effective.recurrence?.start_date, semester.start_date);
  assert.equal(effective.recurrence?.timezone, semester.timezone);
  assert.equal(lecture.recurrence?.timezone, "America/Toronto");
  assert.strictEqual(
    resolveSemesterEvents(
      [lecture],
      [{ ...course, semester_id: null }],
      [semester],
    )[0],
    lecture,
  );
  const standalone = { ...lecture, course_id: null };
  assert.strictEqual(
    resolveSemesterEvents([standalone], [course], [semester])[0],
    standalone,
  );
});

test("travel changes display dates without moving campus classes, including DST", () => {
  const events = resolveSemesterEvents(
    [lecture],
    [course],
    [{ ...semester, timezone: "America/Los_Angeles" }],
  );
  const before = occurrencesOnDate(
    events,
    "2027-03-08",
    "America/Los_Angeles",
  )[0];
  const after = occurrencesOnDate(
    events,
    "2027-03-15",
    "America/Los_Angeles",
  )[0];
  assert.equal(before.starts_at, "2027-03-08T17:30:00.000Z");
  assert.equal(after.starts_at, "2027-03-15T16:30:00.000Z");
  const travel = occurrencesOnDate(events, "2027-03-16", "Asia/Tokyo")[0];
  assert.equal(travel.starts_at, after.starts_at);
  assert.equal(travel.original_date, "2027-03-15");
  assert.equal(
    weeklyScheduleLabel(
      events[0],
      "Asia/Tokyo",
      true,
      new Date("2027-03-15T00:00Z"),
    ),
    "Tue 01:30–02:30",
  );
});

test("semester edits preserve replacements, skipped dates, and explicit events outside teaching dates", () => {
  const exam: StudyEvent = {
    ...lecture,
    id: "exam",
    recurrence: null,
    kind: "exam",
    parent_event_id: lecture.id,
    occurrence_date: "2027-03-15",
    starts_at: "2027-03-15T16:30:00.000Z",
    ends_at: "2027-03-15T17:30:00.000Z",
  };
  const skip = {
    ...exam,
    id: "skip",
    occurrence_date: "2027-03-08",
    cancelled: true,
  };
  const original = [lecture, exam, skip];
  const events = resolveSemesterEvents(original, [course], [semester]);
  assert.deepEqual(
    occurrencesOnDate(events, "2027-03-15", "America/Vancouver").map(
      (o) => o.event.id,
    ),
    ["exam"],
  );
  assert.equal(
    occurrencesOnDate(events, "2027-03-08", "America/Vancouver").length,
    0,
  );
  const shortened = { ...semester, end_date: "2027-02-28" };
  const next = resolveSemesterEvents(original, [course], [shortened]);
  assert.strictEqual(next[1], exam);
  assert.deepEqual(
    exceptionsOutsideSemester(shortened, [course], next).map((e) => e.id),
    ["exam", "skip"],
  );
  assert.equal(
    occurrencesOnDate(next, "2027-03-15", "America/Vancouver")[0].event.id,
    "exam",
  );
});
