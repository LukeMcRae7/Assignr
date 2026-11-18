import { useState } from "react";
import { Switch, View } from "react-native";
import {
  addDateDays,
  dayKey,
  displayDate,
  displayTime,
  isDate,
  isTime,
  zonedISO,
} from "../../domain/dates";
import {
  CLASS_KINDS,
  EVENT_KINDS,
  EventKind,
  StudyEvent,
} from "../../domain/model";
import { newId, useWorkspace } from "../../providers/WorkspaceProvider";
import {
  Button,
  Chip,
  Field,
  formRow,
  IconButton,
  Sheet,
  Text,
} from "../../ui/primitives";
import { useTheme } from "../../ui/theme";
import { DateTimeField } from "../../ui/DateTimeField";

export interface EventEditorProps {
  event?: StudyEvent;
  kind?: EventKind;
  courseId?: string;
  date?: string;
  parentId?: string;
  originalDate?: string;
  onClose(): void;
}
export function EventEditor({
  event,
  kind = "assignment",
  courseId,
  date,
  parentId,
  originalDate,
  onClose,
}: EventEditorProps) {
  const {
    base,
    courses,
    semesters,
    events,
    preferences: p,
    saveEvent,
  } = useWorkspace();
  const t = useTheme();
  const [draft, setDraft] = useState<StudyEvent>(
    () =>
      event || {
        ...base(),
        title: "",
        kind,
        course_id: courseId || null,
        starts_at: null,
        ends_at: null,
        due_at: null,
        recurrence: null,
        parent_event_id: parentId || null,
        occurrence_date: originalDate || null,
        cancelled: false,
        location: "",
        notes: "",
        priority: null,
        completed: false,
        subtasks: [],
      },
  );
  const zone = event?.recurrence?.timezone || p.timezone;
  const timePoint = event?.starts_at || event?.due_at;
  const [eventDate, setDate] = useState(
    date ||
      (timePoint
        ? displayDate(timePoint, zone, "yyyy-MM-dd")
        : dayKey(new Date(), zone)),
  );
  const [endDate, setEndDate] = useState(
    event?.ends_at ? displayDate(event.ends_at, zone, "yyyy-MM-dd") : eventDate,
  );
  const [startTime, setStartTime] = useState(
    event?.starts_at ? displayTime(event.starts_at, zone, true) : "09:30",
  );
  const [endTime, setEndTime] = useState(
    event?.ends_at ? displayTime(event.ends_at, zone, true) : "10:30",
  );
  const [dueTime, setDueTime] = useState(
    event?.due_at ? displayTime(event.due_at, zone, true) : p.default_due_time,
  );
  const [timing, setTiming] = useState<"due" | "timed">(
    event
      ? event.due_at
        ? "due"
        : "timed"
      : kind === "assignment"
        ? "due"
        : "timed",
  );
  const [weekly, setWeekly] = useState(
    !!event?.recurrence || (!event && CLASS_KINDS.includes(kind)),
  );
  const [rule, setRule] = useState(
    event?.recurrence || {
      days: [new Date(`${eventDate}T12:00:00Z`).getUTCDay()],
      start_date: eventDate,
      end_date: addDateDays(eventDate, 112),
      start_time: startTime,
      end_time: endTime,
      timezone: p.timezone,
    },
  );
  const [advanced, setAdvanced] = useState(
    !!event?.notes ||
      !!event?.priority ||
      !!parentId ||
      !!event?.parent_event_id,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const patch = (value: Partial<StudyEvent>) =>
    setDraft((d) => ({ ...d, ...value }));
  const classes = events.filter(
    (e) =>
      e.recurrence &&
      e.course_id === draft.course_id &&
      CLASS_KINDS.includes(e.kind),
  );
  const semester = CLASS_KINDS.includes(draft.kind)
    ? semesters.find(
        (s) =>
          s.id === courses.find((c) => c.id === draft.course_id)?.semester_id,
      )
    : undefined;
  const effectiveRule = semester
    ? {
        ...rule,
        start_date: semester.start_date,
        end_date: semester.end_date,
        timezone: semester.timezone,
      }
    : rule;
  async function save() {
    setBusy(true);
    setError("");
    try {
      let next = {
        ...draft,
        starts_at: null,
        ends_at: null,
        due_at: null,
        recurrence: null,
      } as StudyEvent;
      if (weekly && timing === "timed") next.recurrence = effectiveRule;
      else {
        if (!isDate(eventDate))
          throw new Error("Enter the date as YYYY-MM-DD.");
        if (timing === "due") {
          if (!isTime(dueTime))
            throw new Error("Enter the time as HH:MM using 24-hour time.");
          next.due_at = zonedISO(eventDate, dueTime, p.timezone);
        } else {
          if (!isTime(startTime) || !isTime(endTime) || !isDate(endDate))
            throw new Error("Enter valid dates and 24-hour times.");
          next.starts_at = zonedISO(eventDate, startTime, p.timezone);
          next.ends_at = zonedISO(endDate, endTime, p.timezone);
        }
      }
      await saveEvent(next);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save event.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      visible
      title={
        event
          ? event.recurrence
            ? "Edit weekly class"
            : "Edit event"
          : weekly
            ? "New weekly class"
            : "New event"
      }
      onClose={onClose}
      footer={
        <Button
          onPress={() => {
            void save();
          }}
          busy={busy}
        >
          {event ? "Save changes" : "Create event"}
        </Button>
      }
    >
      <Field
        label="Title"
        placeholder={
          draft.kind === "assignment" ? "e.g. Problem set 3" : "e.g. Midterm"
        }
        value={draft.title}
        onChangeText={(title) => patch({ title })}
        maxLength={180}
        autoFocus
      />
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: "600" }}>Type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {EVENT_KINDS.map((k) => (
            <Chip
              key={k}
              selected={k === draft.kind}
              onPress={() => {
                patch({ kind: k });
                if (k === "assignment") {
                  setTiming("due");
                  setWeekly(false);
                } else if (draft.kind === "assignment") setTiming("timed");
              }}
            >
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </Chip>
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: "600" }}>Course</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip
            selected={!draft.course_id}
            onPress={() =>
              patch({
                course_id: null,
                parent_event_id: null,
                occurrence_date: null,
              })
            }
          >
            Personal
          </Chip>
          {courses.map((c) => (
            <Chip
              key={c.id}
              color={c.color}
              selected={c.id === draft.course_id}
              onPress={() =>
                patch({
                  course_id: c.id,
                  parent_event_id: null,
                  occurrence_date: null,
                })
              }
            >
              {c.code || c.name}
            </Chip>
          ))}
        </View>
      </View>
      {draft.kind !== "assignment" ? (
        <View style={formRow}>
          <Chip
            selected={timing === "timed"}
            onPress={() => setTiming("timed")}
          >
            Start & end time
          </Chip>
          <Chip
            selected={timing === "due"}
            onPress={() => {
              setTiming("due");
              setWeekly(false);
            }}
          >
            Due time
          </Chip>
        </View>
      ) : null}
      {timing === "timed" && !draft.parent_event_id ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text>Repeat weekly</Text>
          <Switch
            accessibilityLabel="Repeat weekly"
            value={weekly}
            onValueChange={setWeekly}
            trackColor={{ true: t.accent }}
          />
        </View>
      ) : null}
      {weekly ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <Chip
                key={d}
                selected={rule.days.includes(i)}
                onPress={() =>
                  setRule((r) => ({
                    ...r,
                    days: r.days.includes(i)
                      ? r.days.filter((n) => n !== i)
                      : [...r.days, i].sort(),
                  }))
                }
              >
                {d}
              </Chip>
            ))}
          </View>
          {semester ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontWeight: "600" }}>{semester.name}</Text>
              <Text muted style={{ fontSize: 13 }}>
                Classes follow this semester’s teaching dates.
              </Text>
              {semester.timezone !== p.timezone ? (
                <Text muted style={{ fontSize: 12 }}>
                  Enter class times in {semester.timezone.replaceAll("_", " ")}.
                  Your schedule displays in local time.
                </Text>
              ) : null}
            </View>
          ) : (
            <>
              <View style={formRow}>
                <DateTimeField
                  mode="date"
                  label="Term starts"
                  placeholder="YYYY-MM-DD"
                  value={rule.start_date}
                  onChangeText={(start_date) =>
                    setRule((r) => ({ ...r, start_date }))
                  }
                />
                <DateTimeField
                  mode="date"
                  label="Term ends"
                  placeholder="YYYY-MM-DD"
                  value={rule.end_date}
                  onChangeText={(end_date) =>
                    setRule((r) => ({ ...r, end_date }))
                  }
                />
              </View>
            </>
          )}
          <View style={formRow}>
            <DateTimeField
              mode="time"
              label="Starts at"
              placeholder="09:30"
              value={rule.start_time}
              onChangeText={(start_time) =>
                setRule((r) => ({ ...r, start_time }))
              }
            />
            <DateTimeField
              mode="time"
              label="Ends at"
              placeholder="10:30"
              value={rule.end_time}
              onChangeText={(end_time) => setRule((r) => ({ ...r, end_time }))}
            />
          </View>
        </>
      ) : (
        <>
          <DateTimeField
            mode="date"
            label={timing === "due" ? "Due date" : "Start date"}
            value={eventDate}
            onChangeText={(d) => {
              if (endDate === eventDate) setEndDate(d);
              setDate(d);
            }}
          />
          {timing === "due" ? (
            <DateTimeField
              mode="time"
              label="Due time"
              value={dueTime}
              onChangeText={setDueTime}
            />
          ) : (
            <>
              <DateTimeField
                mode="date"
                label="End date"
                value={endDate}
                onChangeText={setEndDate}
              />
              <View style={formRow}>
                <DateTimeField
                  mode="time"
                  label="Starts at"
                  value={startTime}
                  onChangeText={setStartTime}
                />
                <DateTimeField
                  mode="time"
                  label="Ends at"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </>
          )}
        </>
      )}
      {timing === "timed" ? (
        <Field
          label="Location"
          placeholder="e.g. B9201"
          value={draft.location}
          onChangeText={(location) => patch({ location })}
        />
      ) : null}
      {draft.kind === "assignment" ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: "600" }}>
            Subtasks{" "}
            <Text muted style={{ fontSize: 13 }}>
              Optional
            </Text>
          </Text>
          {draft.subtasks.map((s, i) => (
            <View key={s.id} style={{ gap: 10 }}>
              <View style={formRow}>
                <Field
                  label={`Subtask ${i + 1}`}
                  value={s.title}
                  placeholder="A small next step"
                  onChangeText={(title) =>
                    patch({
                      subtasks: draft.subtasks.map((item) =>
                        item.id === s.id ? { ...item, title } : item,
                      ),
                    })
                  }
                />
                <View style={{ paddingTop: 24 }}>
                  <IconButton
                    icon="close"
                    label={`Remove subtask ${i + 1}`}
                    onPress={() =>
                      patch({
                        subtasks: draft.subtasks.filter(
                          (item) => item.id !== s.id,
                        ),
                      })
                    }
                  />
                </View>
              </View>
              <SubtaskTarget
                value={s.target_at}
                zone={p.timezone}
                onChange={(target_at) =>
                  patch({
                    subtasks: draft.subtasks.map((item) =>
                      item.id === s.id ? { ...item, target_at } : item,
                    ),
                  })
                }
              />
            </View>
          ))}
          <Button
            variant="secondary"
            icon="plus"
            onPress={() =>
              patch({
                subtasks: [
                  ...draft.subtasks,
                  { id: newId(), title: "", completed: false, target_at: null },
                ],
              })
            }
          >
            Add subtask
          </Button>
        </View>
      ) : null}
      <Button
        variant="ghost"
        icon={advanced ? "chevron-up" : "chevron-down"}
        onPress={() => setAdvanced(!advanced)}
      >
        More options
      </Button>
      {advanced ? (
        <>
          <Field
            label="Notes"
            placeholder="Anything you want to remember"
            value={draft.notes}
            multiline
            numberOfLines={3}
            onChangeText={(notes) => patch({ notes })}
          />
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "600" }}>Priority</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {([null, "low", "medium", "high"] as const).map((priority) => (
                <Chip
                  key={priority || "none"}
                  selected={draft.priority === priority}
                  onPress={() => patch({ priority })}
                >
                  {priority || "None"}
                </Chip>
              ))}
            </View>
          </View>
          {classes.length && !weekly && timing === "timed" ? (
            <View style={{ gap: 12 }}>
              <Text style={{ fontWeight: "600" }}>Replaces a class</Text>
              <Text muted style={{ fontSize: 13 }}>
                The linked class is hidden on its original date.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Chip
                  selected={!draft.parent_event_id}
                  onPress={() =>
                    patch({ parent_event_id: null, occurrence_date: null })
                  }
                >
                  None
                </Chip>
                {classes.map((c) => (
                  <Chip
                    key={c.id}
                    selected={draft.parent_event_id === c.id}
                    onPress={() =>
                      patch({
                        parent_event_id: c.id,
                        occurrence_date: eventDate,
                      })
                    }
                  >
                    {c.title}
                  </Chip>
                ))}
              </View>
              {draft.parent_event_id ? (
                <DateTimeField
                  mode="date"
                  label="Original class date"
                  value={draft.occurrence_date || ""}
                  onChangeText={(occurrence_date) => patch({ occurrence_date })}
                />
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: t.danger, fontSize: 14 }}
        >
          {error}
        </Text>
      ) : null}
    </Sheet>
  );
}

function SubtaskTarget({
  value,
  zone,
  onChange,
}: {
  value: string | null;
  zone: string;
  onChange(value: string | null): void;
}) {
  const [text, setText] = useState(() =>
    value && !Number.isNaN(Date.parse(value))
      ? `${displayDate(value, zone, "yyyy-MM-dd")} ${displayTime(value, zone, true)}`
      : "",
  );
  const [error, setError] = useState("");
  return (
    <>
      <Field
        label="Target completion"
        placeholder="Optional · YYYY-MM-DD HH:MM"
        value={text}
        onChangeText={(v) => {
          setText(v);
          setError("");
          if (!v) {
            onChange(null);
            return;
          }
          const [date, time] = v.split(" ");
          if (isDate(date) && isTime(time || "")) {
            try {
              onChange(zonedISO(date, time, zone));
            } catch {
              onChange(v);
              setError("Choose a valid local time.");
            }
          } else {
            onChange(v);
            setError("Use YYYY-MM-DD HH:MM.");
          }
        }}
      />
      {error ? <Text style={{ fontSize: 12 }}>{error}</Text> : null}
    </>
  );
}
