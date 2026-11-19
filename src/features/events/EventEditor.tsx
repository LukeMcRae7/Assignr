import { PropsWithChildren, useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
  useWindowDimensions,
} from "react-native";
import {
  addDateDays,
  dayKey,
  displayDate,
  displayTime,
  isDate,
  isTime,
  zonedISO,
} from "../../domain/dates";
import { CLASS_KINDS, EventKind, StudyEvent } from "../../domain/model";
import {
  contextForKind,
  customTypeName,
  typeLabel,
  EventContext,
  kindLabels,
  normalizeSubtasks,
} from "../../domain/eventEditor";
import { occurrencesOnDate, weeklyScheduleLabel } from "../../domain/schedule";
import { newId, useWorkspace } from "../../providers/WorkspaceProvider";
import {
  Button,
  Chip,
  Field,
  FormPresentation,
  FormRow,
  Icon,
  IconButton,
  Sheet,
  Text,
} from "../../ui/primitives";
import { useTheme } from "../../ui/theme";
import { DateTimeField } from "../../ui/DateTimeField";
import { EventTypePicker } from "./EventTypePicker";
import { CourseSelector } from "./CourseSelector";
import { useDraftGuard } from "../../ui/useDraftGuard";

export interface EventEditorProps {
  quickEntry?: { expanded: boolean; expand(): void };
  event?: StudyEvent;
  kind?: EventKind;
  context?: EventContext;
  presentation?: FormPresentation;
  courseId?: string;
  semesterId?: string;
  date?: string;
  parentId?: string;
  originalDate?: string;
  onClose(): void;
}
export function EventEditor({
  quickEntry,
  event,
  kind = "assignment",
  context,
  presentation = "dialog",
  courseId,
  semesterId,
  date,
  parentId,
  originalDate,
  onClose,
}: EventEditorProps) {
  const {
    base,
    courses,
    semesters,
    selectedSemester,
    events,
    snapshot,
    preferences: p,
    saveEvent,
  } = useWorkspace();
  const t = useTheme();
  const editingContext = context || contextForKind(event?.kind || kind);
  const { width } = useWindowDimensions();
  const desktopEntry = !!quickEntry && width >= 1100;
  const parent = events.find((e) => e.id === parentId);
  const parentOccurrence =
    parent?.recurrence && originalDate
      ? occurrencesOnDate(
          events,
          originalDate,
          parent.recurrence.timezone,
        ).find((o) => o.event.id === parentId)
      : null;
  const legacyCourse = courses.find((c) => c.id === event?.course_id);
  const legacyZone =
    semesters.find((s) => s.id === legacyCourse?.semester_id)?.timezone ||
    snapshot.preferences[0]?.timezone ||
    p.timezone;
  const [draft, setDraft] = useState<StudyEvent>(() =>
    event
      ? {
          ...event,
          title:
            CLASS_KINDS.includes(event.kind) && event.title === typeLabel(event)
              ? ""
              : event.title,
          subtasks: normalizeSubtasks(event.subtasks, legacyZone),
        }
      : {
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
          location: parent?.location || "",
          notes: "",
          priority: null,
          completed: false,
          subtasks: [],
        },
  );
  const point =
    event?.starts_at || event?.due_at || parentOccurrence?.starts_at;
  const end = event?.ends_at || parentOccurrence?.ends_at;
  const [eventDate, setDate] = useState(
    parentOccurrence?.starts_at
      ? displayDate(parentOccurrence.starts_at, p.timezone, "yyyy-MM-dd")
      : date ||
          (point
            ? displayDate(point, p.timezone, "yyyy-MM-dd")
            : dayKey(new Date(), p.timezone)),
  );
  const [endDate, setEndDate] = useState(
    end ? displayDate(end, p.timezone, "yyyy-MM-dd") : eventDate,
  );
  const [startTime, setStartTime] = useState(
    point && !event?.due_at ? displayTime(point, p.timezone, true) : "09:30",
  );
  const [endTime, setEndTime] = useState(
    end ? displayTime(end, p.timezone, true) : "10:30",
  );
  const [dueTime, setDueTime] = useState(
    event?.due_at
      ? displayTime(event.due_at, p.timezone, true)
      : p.default_due_time,
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
      days: [new Date(eventDate + "T12:00:00Z").getUTCDay()],
      start_date: eventDate,
      end_date: addDateDays(eventDate, 112),
      start_time: "09:30",
      end_time: "10:30",
      timezone: p.timezone,
    },
  );
  const [showName, setShowName] = useState(!!draft.title);
  const existingMultiday =
    !!end &&
    !!point &&
    displayDate(end, p.timezone, "yyyy-MM-dd") !==
      displayDate(point, p.timezone, "yyyy-MM-dd");
  const [namingType, setNamingType] = useState(false);
  const [advanced, setAdvanced] = useState(
    existingMultiday ||
      !!event?.notes ||
      !!event?.priority ||
      !!parentId ||
      !!event?.parent_event_id,
  );
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState("");
  const signature = JSON.stringify({
    draft,
    eventDate,
    endDate,
    startTime,
    endTime,
    dueTime,
    weekly,
    rule,
    timing,
  });
  const [initial] = useState(signature);
  const guard = useDraftGuard(initial !== signature, busy, onClose);
  const patch = (value: Partial<StudyEvent>) =>
    setDraft((old) => ({ ...old, ...value }));
  const course = courses.find((c) => c.id === draft.course_id);
  const semester = CLASS_KINDS.includes(draft.kind)
    ? semesters.find((s) => s.id === course?.semester_id)
    : undefined;
  const classes = events.filter(
    (e) =>
      !e.cancelled &&
      e.recurrence &&
      e.course_id === draft.course_id &&
      CLASS_KINDS.includes(e.kind),
  );
  const availableCourses = courses.filter(
    (c) =>
      !c.semester_id ||
      c.semester_id === (semesterId || selectedSemester?.id) ||
      c.id === draft.course_id,
  );
  async function save() {
    if (saving.current) return;
    saving.current = true;
    Keyboard.dismiss();
    setBusy(true);
    setError("");
    try {
      const customType =
        draft.custom_type == null
          ? null
          : customTypeName(draft.custom_type, draft.kind, events);
      const next: StudyEvent = {
        ...draft,
        custom_type: customType,
        title:
          draft.title.trim() ||
          (CLASS_KINDS.includes(draft.kind)
            ? customType || kindLabels[draft.kind]
            : ""),
        starts_at: null,
        ends_at: null,
        due_at: null,
        recurrence: null,
      };
      if (weekly && timing === "timed")
        next.recurrence = semester
          ? {
              ...rule,
              start_date: semester.start_date,
              end_date: semester.end_date,
              timezone: semester.timezone,
            }
          : rule;
      else if (timing === "due") {
        if (!isDate(eventDate)) throw new Error("Choose a due date.");
        if (!isTime(dueTime)) throw new Error("Choose a due time.");
        next.due_at = zonedISO(eventDate, dueTime, p.timezone);
      } else {
        if (!isDate(eventDate) || !isDate(endDate))
          throw new Error("Choose valid start and end dates.");
        if (!isTime(startTime) || !isTime(endTime))
          throw new Error("Choose start and end times.");
        next.starts_at = zonedISO(eventDate, startTime, p.timezone);
        next.ends_at = zonedISO(endDate, endTime, p.timezone);
      }
      await saveEvent(next);
      guard.finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save event.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const isClass = CLASS_KINDS.includes(draft.kind);
  const heading =
    (event ? "Edit " : "New ") +
    (draft.custom_type?.trim() || kindLabels[draft.kind]).toLowerCase();
  function selectType(kind: EventKind, custom_type: string | null = null) {
    Keyboard.dismiss();
    setNamingType(custom_type === "");
    patch({ kind, custom_type });
    if (kind !== draft.kind) {
      setTiming(kind === "assignment" ? "due" : "timed");
      setWeekly(
        !draft.parent_event_id &&
          CLASS_KINDS.includes(kind) &&
          !(custom_type === "" && draft.kind === "activity"),
      );
    }
  }
  const action = (
    <Button
      compact
      label={
        event
          ? "Save changes"
          : "Create " +
            (draft.custom_type?.trim() || kindLabels[draft.kind]).toLowerCase()
      }
      busy={busy}
      onPress={() => void save()}
    >
      {event ? "Save" : "Create"}
    </Button>
  );
  const titleField =
    isClass && !showName ? (
      <Button
        compact
        variant="ghost"
        icon="pencil-outline"
        onPress={() => setShowName(true)}
      >
        Add name
      </Button>
    ) : (
      <Field
        label={
          desktopEntry
            ? "Assignment name"
            : isClass
              ? "Name (optional)"
              : "Title"
        }
        hideLabel
        prominent={!desktopEntry}
        placeholder={
          isClass
            ? kindLabels[draft.kind]
            : draft.kind === "assignment"
              ? "Assignment name"
              : "Event name"
        }
        outlined={desktopEntry}
        value={draft.title}
        onChangeText={(title) => patch({ title })}
        maxLength={180}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        onFocus={desktopEntry ? quickEntry?.expand : undefined}
        autoFocus={
          !desktopEntry && Platform.OS === "web" && presentation === "inline"
        }
      />
    );
  const fields = (
    <>
      <EventTypePicker
        context={editingContext}
        draft={draft}
        existingKind={event?.kind}
        events={events}
        naming={namingType}
        select={selectType}
        setName={(custom_type) => patch({ custom_type })}
      />
      <CourseSelector
        courses={availableCourses}
        selected={course}
        onSelect={(course_id) => {
          if (course_id !== draft.course_id)
            patch({
              course_id,
              parent_event_id: null,
              occurrence_date: null,
            });
        }}
      />
      {draft.kind === "activity" ||
      (event && draft.kind !== "assignment" && event.due_at) ? (
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Chip
            selected={timing === "timed"}
            onPress={() => setTiming("timed")}
          >
            Time range
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
          <Text style={{ fontSize: 14 }}>Repeat weekly</Text>
          <Switch
            accessibilityLabel="Repeat weekly"
            value={weekly}
            onValueChange={(value) => {
              Keyboard.dismiss();
              setWeekly(value);
            }}
            trackColor={{ true: t.accent }}
          />
        </View>
      ) : null}
      {weekly ? (
        <>
          <View style={{ flexDirection: "row", gap: 3 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day, index) => (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={day}
                  accessibilityState={{ selected: rule.days.includes(index) }}
                  aria-pressed={rule.days.includes(index)}
                  onPress={() =>
                    setRule({
                      ...rule,
                      days: rule.days.includes(index)
                        ? rule.days.filter((d) => d !== index)
                        : [...rule.days, index].sort(),
                    })
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 9,
                    backgroundColor: rule.days.includes(index)
                      ? t.elevated
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: rule.days.includes(index) ? t.accent : t.muted,
                    }}
                  >
                    {day.slice(0, 2)}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
          {semester ? (
            <Text muted style={{ fontSize: 12 }}>
              {semester.name}
            </Text>
          ) : (
            <FormRow>
              <DateTimeField
                mode="date"
                label="Starts"
                value={rule.start_date}
                onChangeText={(start_date) => setRule({ ...rule, start_date })}
              />
              <DateTimeField
                mode="date"
                label="Ends"
                value={rule.end_date}
                onChangeText={(end_date) => setRule({ ...rule, end_date })}
              />
            </FormRow>
          )}
          <FormRow>
            <DateTimeField
              mode="time"
              label="Starts at"
              value={rule.start_time}
              onChangeText={(start_time) => setRule({ ...rule, start_time })}
            />
            <DateTimeField
              mode="time"
              label="Ends at"
              value={rule.end_time}
              onChangeText={(end_time) => setRule({ ...rule, end_time })}
            />
          </FormRow>
          {semester && semester.timezone !== p.timezone ? (
            <Text muted style={{ fontSize: 12 }}>
              Class times in{" "}
              {new Intl.DateTimeFormat(undefined, {
                timeZone: semester.timezone,
                timeZoneName: "shortGeneric",
              })
                .formatToParts(new Date(semester.start_date + "T12:00:00Z"))
                .find((part) => part.type === "timeZoneName")?.value ||
                semester.timezone}
            </Text>
          ) : null}
        </>
      ) : timing === "due" ? (
        <FormRow>
          <DateTimeField
            mode="date"
            label="Due date"
            value={eventDate}
            onChangeText={(date) => {
              setDate(date);
              setEndDate(date);
            }}
          />
          <DateTimeField
            mode="time"
            label="Due time"
            value={dueTime}
            onChangeText={setDueTime}
          />
        </FormRow>
      ) : (
        <>
          <DateTimeField
            mode="date"
            label="Date"
            value={eventDate}
            onChangeText={(d) => {
              if (endDate === eventDate || endDate < d) setEndDate(d);
              setDate(d);
            }}
          />
          <FormRow>
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
          </FormRow>
        </>
      )}
      {timing === "timed" ? (
        <Field
          label="Location"
          placeholder="Add a location"
          value={draft.location}
          onChangeText={(location) => patch({ location })}
        />
      ) : null}
      {draft.kind === "assignment" ? (
        <View testID="subtask-list" style={{ gap: 4 }}>
          {draft.subtasks.length ? (
            <Text muted style={{ fontSize: 12, marginBottom: 4 }}>
              Subtasks
            </Text>
          ) : null}
          {draft.subtasks.map((subtask, index) => (
            <View
              key={subtask.id}
              testID="subtask-row"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                minHeight: 44,
              }}
            >
              <Icon name="circle-outline" size={14} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Field
                  hideLabel
                  label={"Subtask " + (index + 1)}
                  value={subtask.title}
                  placeholder="Subtask name"
                  onChangeText={(title) =>
                    patch({
                      subtasks: draft.subtasks.map((s) =>
                        s.id === subtask.id ? { ...s, title } : s,
                      ),
                    })
                  }
                />
              </View>
              <DateTimeField
                compact
                mode="date"
                label={"Target date " + (index + 1)}
                value={subtask.target_date || ""}
                onChangeText={(target_date) =>
                  patch({
                    subtasks: draft.subtasks.map((s) =>
                      s.id === subtask.id
                        ? { ...s, target_date: target_date || null }
                        : s,
                    ),
                  })
                }
                onClear={() =>
                  patch({
                    subtasks: draft.subtasks.map((s) =>
                      s.id === subtask.id ? { ...s, target_date: null } : s,
                    ),
                  })
                }
              />
              <IconButton
                icon="close"
                label={"Remove subtask " + (index + 1)}
                onPress={() =>
                  patch({
                    subtasks: draft.subtasks.filter((s) => s.id !== subtask.id),
                  })
                }
              />
            </View>
          ))}
          <View style={{ alignItems: "flex-start" }}>
            <Button
              compact
              variant="ghost"
              icon="plus"
              onPress={() =>
                patch({
                  subtasks: [
                    ...draft.subtasks,
                    {
                      id: newId(),
                      title: "",
                      completed: false,
                      target_date: null,
                    },
                  ],
                })
              }
            >
              Add subtask
            </Button>
          </View>
        </View>
      ) : null}
      <View style={{ alignItems: "flex-start" }}>
        <Button
          compact
          variant="ghost"
          icon={advanced ? "chevron-up" : "chevron-down"}
          onPress={() => {
            Keyboard.dismiss();
            setAdvanced(!advanced);
          }}
        >
          More options
        </Button>
      </View>
      {advanced ? (
        <>
          {!weekly && timing === "timed" ? (
            <DateTimeField
              mode="date"
              label="End date"
              value={endDate}
              onChangeText={setEndDate}
            />
          ) : null}
          <Field
            label="Notes"
            placeholder="Add notes"
            multiline
            numberOfLines={3}
            value={draft.notes}
            onChangeText={(notes) => patch({ notes })}
          />
          <View style={{ gap: 7 }}>
            <Text muted style={{ fontSize: 12 }}>
              Priority
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
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
          {classes.length > 0 && !weekly && timing === "timed" ? (
            <View style={{ gap: 8 }}>
              <Text muted style={{ fontSize: 12 }}>
                Replaces a class
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
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
                        occurrence_date: isDate(eventDate)
                          ? occurrencesOnDate([c], eventDate, p.timezone)[0]
                              ?.original_date || null
                          : null,
                      })
                    }
                  >
                    {c.title} · {weeklyScheduleLabel(c, p.timezone, p.hour24)}
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
    </>
  );
  if (desktopEntry)
    return (
      <>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 14, padding: 2, paddingBottom: 16 }}
        >
          {titleField}
          {quickEntry.expanded ? (
            <EntryFields>
              {fields}
              {error ? (
                <Text accessibilityRole="alert" style={{ color: t.danger }}>
                  {error}
                </Text>
              ) : null}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                {action}
                <Button compact variant="ghost" onPress={guard.requestClose}>
                  Collapse
                </Button>
              </View>
            </EntryFields>
          ) : null}
        </ScrollView>
        {guard.confirmation}
      </>
    );
  return (
    <>
      <Sheet
        visible
        large
        title={heading}
        presentation={presentation}
        error={error}
        onClose={guard.requestClose}
        action={action}
      >
        {titleField}
        {fields}
      </Sheet>
      {guard.confirmation}
    </>
  );
}

function EntryFields({ children }: PropsWithChildren) {
  const { reduceMotion } = useTheme();
  const [opacity] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const fade = Animated.timing(opacity, {
      toValue: 1,
      duration: 140,
      useNativeDriver: Platform.OS !== "web",
    });
    fade.start();
    return () => fade.stop();
  }, [opacity, reduceMotion]);
  return <Animated.View style={{ opacity, gap: 14 }}>{children}</Animated.View>;
}
