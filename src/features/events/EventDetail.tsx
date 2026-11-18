import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { displayDate, displayTime } from "../../domain/dates";
import {
  occurrencesOnDate,
  subtaskProgress,
  weeklyScheduleLabel,
} from "../../domain/schedule";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import { Button, Confirm, Icon, Panel, Sheet, Text } from "../../ui/primitives";
import { useTheme } from "../../ui/theme";
import { EventEditor } from "./EventEditor";
import { kindIcons } from "./EventRows";

export function EventDetail({ id, date }: { id: string; date?: string }) {
  const w = useWorkspace();
  const t = useTheme();
  const [edit, setEdit] = useState(false);
  const [reschedule, setReschedule] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const event = w.events.find((e) => e.id === id);
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  if (!event)
    return (
      <Sheet visible title="Event unavailable" onClose={close}>
        <Text muted>This event may have been deleted on another device.</Text>
        <Button onPress={close}>Close</Button>
      </Sheet>
    );
  const course = w.courses.find((c) => c.id === event.course_id);
  const exceptions = w.events
    .filter((e) => e.parent_event_id === id)
    .sort((a, b) =>
      (a.occurrence_date || "").localeCompare(b.occurrence_date || ""),
    );
  const p = w.preferences;
  const occurrence =
    date && event.recurrence
      ? occurrencesOnDate(w.events, date, event.recurrence.timezone).find(
          (o) => o.event.id === id,
        )
      : null;
  if (edit) return <EventEditor event={event} onClose={close} />;
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
        onClose={close}
      />
    );
  return (
    <Sheet visible title={event.title} onClose={close}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Icon
          name={kindIcons[event.kind]}
          color={event.kind === "exam" ? t.danger : course?.color || t.accent}
          size={28}
        />
        <View>
          <Text style={{ fontWeight: "500" }}>
            {course?.name || "Personal"}
          </Text>
          <Text muted style={{ textTransform: "capitalize", fontSize: 13 }}>
            {event.kind}
            {event.parent_event_id ? " · Replaces a class" : ""}
          </Text>
        </View>
      </View>
      <Panel>
        {event.recurrence ? (
          <>
            <Text>{weeklyScheduleLabel(event, p.timezone, p.hour24)}</Text>
            {event.recurrence.timezone !== p.timezone ? (
              <Text muted style={{ fontSize: 12 }}>
                Shown in your device timezone. The weekly schedule stays
                anchored to its original timezone.
              </Text>
            ) : null}
            <Text muted style={{ fontSize: 13 }}>
              {event.recurrence.start_date} through {event.recurrence.end_date}
            </Text>
            {date ? (
              <Text style={{ color: t.accent }}>Selected class: {date}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Text>
              {displayDate(
                (event.starts_at || event.due_at)!,
                p.timezone,
                "EEEE, MMMM d, yyyy",
              )}
            </Text>
            <Text muted>
              {event.due_at
                ? `Due ${displayTime(event.due_at, p.timezone, p.hour24)}`
                : `${displayTime(event.starts_at!, p.timezone, p.hour24)} – ${displayTime(event.ends_at!, p.timezone, p.hour24)}${event.ends_at!.slice(0, 10) !== event.starts_at!.slice(0, 10) ? ` (${displayDate(event.ends_at!, p.timezone)})` : ""}`}
            </Text>
          </>
        )}
        {event.location ? <Text muted>{event.location}</Text> : null}
      </Panel>
      {event.recurrence && exceptions.length ? (
        <Panel>
          <Text style={{ fontWeight: "600" }}>Class date changes</Text>
          {exceptions.map((change) => (
            <View key={change.id} style={{ gap: 5 }}>
              <Text style={{ fontSize: 14 }}>
                {change.occurrence_date} ·{" "}
                {change.cancelled ? "Skipped" : change.title}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {!change.cancelled ? (
                  <Button
                    variant="ghost"
                    onPress={() => router.replace(`/event/${change.id}`)}
                  >
                    View change
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  onPress={() => {
                    void w.perform(() => w.deleteEvent(change));
                  }}
                >
                  Restore class
                </Button>
              </View>
            </View>
          ))}
        </Panel>
      ) : null}
      {event.notes ? <Text>{event.notes}</Text> : null}
      {event.priority ? (
        <Text muted style={{ fontSize: 14, textTransform: "capitalize" }}>
          {event.priority} priority
        </Text>
      ) : null}
      {event.subtasks.length ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: "600" }}>
            Subtasks · {Math.round(subtaskProgress(event) * 100)}%
          </Text>
          {event.subtasks.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="checkbox"
              accessibilityLabel={s.title}
              accessibilityState={{ checked: s.completed }}
              aria-checked={s.completed}
              onPress={() => {
                void w.perform(() => w.toggleSubtask(event.id, s.id));
              }}
              style={{
                minHeight: 46,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Icon
                name={
                  s.completed ? "checkbox-marked" : "checkbox-blank-outline"
                }
                color={s.completed ? t.accent : t.muted}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    textDecorationLine: s.completed ? "line-through" : "none",
                    color: s.completed ? t.muted : t.text,
                  }}
                >
                  {s.title}
                </Text>
                {s.target_at ? (
                  <Text muted style={{ fontSize: 12 }}>
                    Target{" "}
                    {displayDate(
                      s.target_at,
                      p.timezone,
                      p.hour24 ? "MMM d · HH:mm" : "MMM d · h:mm a",
                    )}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      {event.kind === "assignment" ? (
        <Button
          icon={event.completed ? "undo" : "check"}
          onPress={() => {
            void w.perform(async () => {
              await w.toggleAssignment(event.id);
              close();
            });
          }}
        >
          {event.completed ? "Mark incomplete" : "Complete assignment"}
        </Button>
      ) : null}
      <Button
        variant="secondary"
        icon="pencil-outline"
        onPress={() => setEdit(true)}
      >
        {event.recurrence ? "Edit weekly schedule" : "Edit event"}
      </Button>
      {occurrence ? (
        <>
          <Button
            variant="secondary"
            icon="file-document-outline"
            onPress={() => {
              router.replace({
                pathname: "/event/new",
                params: {
                  kind: "exam",
                  courseId: event.course_id || "",
                  parentId: id,
                  originalDate: date,
                  date,
                },
              });
            }}
          >
            Add in-class exam or quiz
          </Button>
          <Button variant="secondary" onPress={() => setReschedule(true)}>
            Reschedule this class
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              void w.perform(async () => {
                await w.skipOccurrence(occurrence);
                close();
              });
            }}
          >
            Skip this class
          </Button>
        </>
      ) : null}
      <Button variant="danger" onPress={() => setConfirm(true)}>
        {event.recurrence
          ? "Delete weekly class"
          : event.parent_event_id
            ? "Remove replacement"
            : "Delete event"}
      </Button>
      {event.parent_event_id ? (
        <Text muted style={{ fontSize: 12 }}>
          Removing this replacement restores the original class.
        </Text>
      ) : null}
      {confirm ? (
        <Confirm
          title="Delete event?"
          message={
            event.recurrence
              ? "This removes the weekly schedule and all its date-specific changes."
              : "This removes the event from your devices."
          }
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            void w.perform(async () => {
              await w.deleteEvent(event);
              close();
            });
          }}
        />
      ) : null}
    </Sheet>
  );
}
