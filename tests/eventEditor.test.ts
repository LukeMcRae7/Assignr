import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contextForKind,
  editorKinds,
  normalizeSubtasks,
  subtaskDate,
} from "../src/domain/eventEditor";
import { StudyEvent } from "../src/domain/model";
import { validateEvent } from "../src/domain/validation";

test("context restricts creation while preserving legacy types when editing", () => {
  assert.deepEqual(editorKinds("assignments"), ["assignment"]);
  assert.deepEqual(editorKinds("assessments"), ["exam", "quiz"]);
  assert.deepEqual(editorKinds("classes"), ["lecture", "tutorial", "lab"]);
  assert.deepEqual(editorKinds("classes", "seminar"), [
    "lecture",
    "tutorial",
    "lab",
    "seminar",
  ]);
  assert.equal(contextForKind("lab"), "classes");
  assert.ok(editorKinds("general").includes("activity"));
});
test("legacy subtask timestamps retain their date in the semester timezone", () => {
  const legacy = {
    id: "subtask",
    title: "Read",
    completed: true,
    target_at: "2026-11-18T02:00:00Z",
  };
  assert.equal(subtaskDate(legacy, "America/Los_Angeles"), "2026-11-17");
  const normalized = normalizeSubtasks([legacy], "America/Los_Angeles")[0];
  assert.deepEqual(normalized, {
    id: "subtask",
    title: "Read",
    completed: true,
    target_date: "2026-11-17",
  });
  assert.equal(legacy.target_at, "2026-11-18T02:00:00Z");
  assert.equal(
    subtaskDate({ ...legacy, target_date: null }, "Asia/Tokyo"),
    null,
  );
  assert.equal(subtaskDate(normalized, "Asia/Tokyo"), "2026-11-17");
});
test("date-only planning targets validate dates without enforcing an assignment deadline", () => {
  const event: StudyEvent = {
    id: "event",
    user_id: "local",
    version: 0,
    deleted_at: null,
    title: "Assignment",
    course_id: null,
    kind: "assignment",
    starts_at: null,
    ends_at: null,
    due_at: "2026-11-17T23:59:00Z",
    recurrence: null,
    parent_event_id: null,
    occurrence_date: null,
    cancelled: false,
    completed: false,
    location: "",
    notes: "",
    priority: null,
    subtasks: [
      { id: "s", title: "Read", completed: false, target_date: "2030-03-01" },
    ],
  };
  assert.equal(validateEvent(event), null);
  assert.equal(
    validateEvent({
      ...event,
      subtasks: [{ ...event.subtasks[0], target_date: "2026-02-30" }],
    }),
    "Choose a valid subtask target date.",
  );
});
