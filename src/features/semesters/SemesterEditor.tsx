import { useState } from "react";
import { addDateDays, dayKey } from "../../domain/dates";
import { Semester } from "../../domain/model";
import { exceptionsOutsideSemester } from "../../domain/semesters";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import { DateTimeField } from "../../ui/DateTimeField";
import { Button, Confirm, Field, Sheet, Text } from "../../ui/primitives";
import { useTheme } from "../../ui/theme";

export function SemesterEditor({
  semester,
  onClose,
  onSaved,
}: {
  semester?: Semester;
  onClose(): void;
  onSaved?(semester: Semester): void;
}) {
  const w = useWorkspace();
  const t = useTheme();
  const [draft, setDraft] = useState<Semester>(
    () =>
      semester || {
        ...w.base(),
        name: "",
        start_date: dayKey(new Date(), w.preferences.timezone),
        end_date: addDateDays(dayKey(new Date(), w.preferences.timezone), 112),
        timezone: w.preferences.timezone,
      },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const linked = w.courses.filter((c) => c.semester_id === draft.id);
  const outside = exceptionsOutsideSemester(draft, w.courses, w.events);
  async function save() {
    setBusy(true);
    setError("");
    try {
      await w.saveSemester(draft);
      onSaved?.(draft);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save semester.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      visible
      title={semester ? "Edit semester" : "New semester"}
      onClose={onClose}
      footer={
        <Button busy={busy} onPress={() => void save()}>
          {semester ? "Save semester" : "Create semester"}
        </Button>
      }
    >
      <Field
        label="Semester name"
        placeholder="e.g. Fall 2026"
        value={draft.name}
        onChangeText={(name) => setDraft({ ...draft, name })}
        maxLength={120}
      />
      <DateTimeField
        mode="date"
        label="Teaching starts"
        value={draft.start_date}
        onChangeText={(start_date) => setDraft({ ...draft, start_date })}
      />
      <DateTimeField
        mode="date"
        label="Teaching ends"
        value={draft.end_date}
        onChangeText={(end_date) => setDraft({ ...draft, end_date })}
      />
      <Text muted style={{ fontSize: 13 }}>
        Regular classes follow these dates. Assignments and exams can fall
        outside them.
      </Text>
      <Text muted style={{ fontSize: 13 }}>
        Timezone detected automatically: {draft.timezone.replaceAll("_", " ")}.
        Classes stay anchored here when you travel.
      </Text>
      {semester && linked.length ? (
        <Text muted style={{ fontSize: 13 }}>
          Date changes apply to regular classes in {linked.length}{" "}
          {linked.length === 1 ? "course" : "courses"}.
        </Text>
      ) : null}
      {outside.length ? (
        <Text style={{ color: t.danger }}>
          {outside.length} class{" "}
          {outside.length === 1 ? "change falls" : "changes fall"} outside these
          teaching dates. They will be kept; review them in the course schedule.
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: t.danger }}>
          {error}
        </Text>
      ) : null}
      {semester && !linked.length ? (
        <Button variant="danger" onPress={() => setConfirm(true)}>
          Delete semester
        </Button>
      ) : null}
      {confirm ? (
        <Confirm
          title="Delete semester?"
          message="This semester has no courses."
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            void w.perform(async () => {
              await w.deleteSemester(draft);
              onClose();
            });
          }}
        />
      ) : null}
    </Sheet>
  );
}
