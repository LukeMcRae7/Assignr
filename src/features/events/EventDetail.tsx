import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { format, parseISO } from "date-fns";
import { displayDate, displayTime } from "../../domain/dates";
import { typeLabel, subtaskDate } from "../../domain/eventEditor";
import {
  occurrencesOnDate,
  subtaskProgress,
  weeklyScheduleLabel,
} from "../../domain/schedule";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import {
  Button,
  Confirm,
  FormPresentation,
  Icon,
  IconButton,
  Sheet,
  Text,
} from "../../ui/primitives";
import { useTheme } from "../../ui/theme";
import { EventEditor } from "./EventEditor";
import { kindIcons } from "./EventRows";

export function EventDetail({
  id,
  date,
  onClose,
  onEditStart,
  presentation = "dialog",
}: {
  id: string;
  date?: string;
  onClose?(): void;
  onEditStart?(): void;
  presentation?: FormPresentation;
}) {
  const w = useWorkspace();
  const t = useTheme();
  const [edit, setEdit] = useState(false),
    [reschedule, setReschedule] = useState(false),
    [replacement, setReplacement] = useState(false);
  const [menu, setMenu] = useState(false),
    [confirm, setConfirm] = useState(false),
    [changes, setChanges] = useState(false);
  const event = w.events.find((e) => e.id === id);
  const close = () => {
    if (onClose) onClose();
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  if (!event)
    return (
      <Sheet
        visible
        title="Event unavailable"
        onClose={close}
        presentation={presentation}
      >
        <Text muted>This event may have been deleted.</Text>
      </Sheet>
    );
  const course = w.courses.find((c) => c.id === event.course_id);
  const semester = w.semesters.find((s) => s.id === course?.semester_id);
  const legacyZone =
    semester?.timezone ||
    w.snapshot.preferences[0]?.timezone ||
    w.preferences.timezone;
  const p = w.preferences;
  const exceptions = w.events
    .filter((e) => e.parent_event_id === id)
    .sort((a, b) =>
      (a.occurrence_date || "").localeCompare(b.occurrence_date || ""),
    );
  const occurrence =
    date && event.recurrence
      ? occurrencesOnDate(w.events, date, event.recurrence.timezone).find(
          (o) => o.event.id === id,
        )
      : null;
  if (edit)
    return (
      <EventEditor event={event} presentation={presentation} onClose={close} />
    );
  if (replacement && occurrence)
    return (
      <EventEditor
        kind="exam"
        context="assessments"
        courseId={event.course_id || undefined}
        parentId={id}
        originalDate={date}
        date={date}
        presentation={presentation}
        onClose={close}
      />
    );
  if (reschedule && occurrence)
    return (
      <EventEditor
        event={{
          ...event,
          ...w.base(),
          recurrence: null,
          starts_at: occurrence.starts_at,
          ends_at: occurrence.ends_at,
          parent_event_id: id,
          occurrence_date: date!,
        }}
        presentation={presentation}
        onClose={close}
      />
    );
  const point = event.starts_at || event.due_at;
  const spansDays =
    point &&
    event.ends_at &&
    displayDate(point, p.timezone, "yyyy-MM-dd") !==
      displayDate(event.ends_at, p.timezone, "yyyy-MM-dd");
  return (
    <>
      <Sheet
        visible
        title={event.title}
        onClose={close}
        presentation={presentation}
        action={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Button
              compact
              variant="ghost"
              label={event.recurrence ? "Edit weekly schedule" : "Edit event"}
              onPress={() => {
                onEditStart?.();
                setEdit(true);
              }}
            >
              Edit
            </Button>
            <IconButton
              icon="dots-horizontal"
              label="More event actions"
              onPress={() => setMenu(true)}
            />
          </View>
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon
            name={course?.icon || kindIcons[event.kind]}
            size={24}
            color={event.kind === "exam" ? t.danger : course?.color || t.accent}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "500" }}>
              {course?.name || "Personal"}
            </Text>
            {event.parent_event_id || event.title !== typeLabel(event) ? (
              <Text muted style={{ fontSize: 12 }}>
                {typeLabel(event)}
                {event.parent_event_id ? " · Replaces a class" : ""}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={{ gap: 12 }}>
          {event.recurrence ? (
            <>
              <DetailRow
                icon="calendar-clock-outline"
                text={weeklyScheduleLabel(event, p.timezone, p.hour24)}
              />
              {semester ? (
                <Text muted style={{ fontSize: 12 }}>
                  {semester.name}
                </Text>
              ) : null}
              {date ? (
                <Text muted style={{ fontSize: 12 }}>
                  Selected class: {format(parseISO(date), "EEE, MMM d")}
                </Text>
              ) : null}
            </>
          ) : point ? (
            <>
              <DetailRow
                icon="calendar-blank-outline"
                text={
                  spansDays
                    ? displayDate(point, p.timezone, "EEE, MMM d") +
                      " – " +
                      displayDate(
                        event.ends_at!,
                        p.timezone,
                        "EEE, MMM d, yyyy",
                      )
                    : displayDate(point, p.timezone, "EEE, MMM d, yyyy")
                }
              />
              <DetailRow
                icon="clock-outline"
                text={
                  event.due_at
                    ? "Due " + displayTime(event.due_at, p.timezone, p.hour24)
                    : displayTime(event.starts_at!, p.timezone, p.hour24) +
                      " – " +
                      displayTime(event.ends_at!, p.timezone, p.hour24)
                }
              />
            </>
          ) : null}
          {event.location ? (
            <DetailRow icon="map-marker-outline" text={event.location} />
          ) : null}
        </View>
        {event.notes ? (
          <Text style={{ fontSize: 14 }}>{event.notes}</Text>
        ) : null}
        {event.priority ? (
          <Text muted style={{ fontSize: 12, textTransform: "capitalize" }}>
            {event.priority} priority
          </Text>
        ) : null}
        {event.subtasks.length ? (
          <View style={{ gap: 4 }}>
            <Text muted style={{ fontSize: 12, marginBottom: 4 }}>
              Subtasks · {Math.round(subtaskProgress(event) * 100)}%
            </Text>
            {event.subtasks.map((s) => {
              const target = subtaskDate(s, legacyZone);
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={s.title}
                  accessibilityState={{ checked: s.completed }}
                  aria-checked={s.completed}
                  onPress={() =>
                    void w.perform(() => w.toggleSubtask(event.id, s.id))
                  }
                  style={{
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon
                    name={
                      s.completed ? "checkbox-marked" : "checkbox-blank-outline"
                    }
                    size={21}
                    color={s.completed ? course?.color || t.accent : t.muted}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      textDecorationLine: s.completed ? "line-through" : "none",
                      color: s.completed ? t.muted : t.text,
                    }}
                  >
                    {s.title}
                  </Text>
                  {target ? (
                    <Text muted style={{ fontSize: 12 }}>
                      {format(parseISO(target), "MMM d")}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {event.recurrence && exceptions.length ? (
          <View style={{ gap: 8 }}>
            <Button
              compact
              variant="ghost"
              icon={changes ? "chevron-up" : "chevron-down"}
              onPress={() => setChanges(!changes)}
            >
              Class changes ({exceptions.length})
            </Button>
            {changes
              ? exceptions.map((change) => (
                  <View key={change.id} style={{ gap: 4 }}>
                    <Text muted style={{ fontSize: 12 }}>
                      {change.occurrence_date} ·{" "}
                      {change.cancelled ? "Skipped" : change.title}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 5 }}>
                      {!change.cancelled ? (
                        <Button
                          compact
                          variant="ghost"
                          onPress={() => router.push("/event/" + change.id)}
                        >
                          View change
                        </Button>
                      ) : null}
                      <Button
                        compact
                        variant="ghost"
                        onPress={() =>
                          void w.perform(() => w.deleteEvent(change))
                        }
                      >
                        Restore class
                      </Button>
                    </View>
                  </View>
                ))
              : null}
          </View>
        ) : null}
        {event.kind === "assignment" ? (
          <View style={{ alignItems: "flex-start" }}>
            <Button
              compact
              variant="secondary"
              icon={event.completed ? "undo" : "check"}
              onPress={() =>
                void w.perform(async () => {
                  await w.toggleAssignment(event.id);
                  close();
                })
              }
            >
              {event.completed ? "Mark incomplete" : "Complete assignment"}
            </Button>
          </View>
        ) : null}
      </Sheet>
      {menu ? (
        <Sheet visible title="Event actions" onClose={() => setMenu(false)}>
          {occurrence ? (
            <>
              <Button
                compact
                variant="ghost"
                icon="clipboard-check-outline"
                onPress={() => {
                  setMenu(false);
                  onEditStart?.();
                  setReplacement(true);
                }}
              >
                Add in-class exam or quiz
              </Button>
              <Button
                compact
                variant="ghost"
                icon="calendar-edit"
                onPress={() => {
                  setMenu(false);
                  onEditStart?.();
                  setReschedule(true);
                }}
              >
                Reschedule this class
              </Button>
              <Button
                compact
                variant="ghost"
                onPress={() =>
                  void w.perform(async () => {
                    await w.skipOccurrence(occurrence);
                    close();
                  })
                }
              >
                Skip this class
              </Button>
            </>
          ) : null}
          <Button
            compact
            variant="danger"
            icon="trash-can-outline"
            onPress={() => {
              setMenu(false);
              setConfirm(true);
            }}
          >
            {event.recurrence
              ? "Delete weekly class"
              : event.parent_event_id
                ? "Remove replacement"
                : "Delete event"}
          </Button>
        </Sheet>
      ) : null}
      {confirm ? (
        <Confirm
          title="Delete event?"
          message={
            event.recurrence
              ? "This removes the weekly schedule and its class changes."
              : event.parent_event_id
                ? "Removing this replacement restores the original class."
                : "This removes the event from your devices."
          }
          onCancel={() => setConfirm(false)}
          onConfirm={() =>
            void w.perform(async () => {
              await w.deleteEvent(event);
              close();
            })
          }
        />
      ) : null}
    </>
  );
}
function DetailRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <Icon name={icon} size={18} />
      <Text style={{ fontSize: 14, flex: 1 }}>{text}</Text>
    </View>
  );
}
