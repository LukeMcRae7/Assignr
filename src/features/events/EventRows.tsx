import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { displayDate, displayTime, dayKey } from "../../domain/dates";
import { Occurrence, StudyEvent } from "../../domain/model";
import { typeLabel } from "../../domain/eventEditor";
import { subtaskProgress } from "../../domain/schedule";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import { DateTimeField } from "../../ui/DateTimeField";
import { AssignmentTitle } from "./AssignmentTitle";
import { Disclosure } from "../../ui/Disclosure";
import { Icon, Text } from "../../ui/primitives";
import { blend, useTheme } from "../../ui/theme";

export const kindIcons: Record<string, string> = {
  assignment: "clipboard-text-outline",
  exam: "file-document-outline",
  quiz: "clipboard-check-outline",
  lecture: "school-outline",
  tutorial: "account-group-outline",
  lab: "flask-outline",
  seminar: "forum-outline",
  activity: "calendar-star",
};
export function AssignmentRow({
  event,
  showCourse = false,
}: {
  event: StudyEvent;
  showCourse?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    courses,
    preferences: p,
    toggleAssignment,
    toggleSubtask,
    changeDueDate,
    perform,
  } = useWorkspace();
  const t = useTheme();
  const course = courses.find((c) => c.id === event.course_id);
  const progress = subtaskProgress(event);
  const overdue =
    !event.completed &&
    !!event.due_at &&
    event.due_at < new Date().toISOString();
  const dueToday =
    event.due_at &&
    dayKey(new Date(event.due_at), p.timezone) ===
      dayKey(new Date(), p.timezone);
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 2,
        }}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Complete ${event.title}`}
          accessibilityState={{ checked: event.completed }}
          aria-checked={event.completed}
          onPress={() => {
            void perform(() => toggleAssignment(event.id));
          }}
          style={{
            width: 44,
            minHeight: 44,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 23,
              height: 23,
              borderWidth: 2,
              borderColor: event.completed ? t.accent : t.muted,
              borderRadius: 5,
              backgroundColor: event.completed ? t.accent : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {event.completed ? (
              <Icon name="check" size={17} color="#FFF" />
            ) : null}
          </View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${event.title}`}
            onPress={() => router.push(`/event/${event.id}`)}
            style={{ gap: 3, minHeight: 32, justifyContent: "center" }}
          >
            <AssignmentTitle title={event.title} completed={event.completed} />
            {showCourse ? (
              <Text
                muted
                numberOfLines={1}
                style={{ fontSize: 12, lineHeight: 16 }}
              >
                {course?.name || "Personal"}
              </Text>
            ) : null}
          </Pressable>
        </View>
        {event.subtasks.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Subtasks for " + event.title}
            aria-expanded={expanded}
            onPress={() => setExpanded(!expanded)}
            style={{
              minHeight: 44,
              justifyContent: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Icon
              size={16}
              color={t.muted}
              name={expanded ? "chevron-down" : "chevron-right"}
            />
            <View style={{ gap: 2, minWidth: 20 }}>
              <Text
                muted
                style={{ fontSize: 11, lineHeight: 14, textAlign: "center" }}
              >
                {event.subtasks.filter((s) => s.completed).length}/
                {event.subtasks.length}
              </Text>
              <View
                style={{
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: t.elevated,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 3,
                    width: `${progress * 100}%`,
                    backgroundColor: course?.color || t.accent,
                  }}
                />
              </View>
            </View>
          </Pressable>
        ) : null}
        <View style={{ alignItems: "flex-end", gap: 0 }}>
          {event.priority ? (
            <Icon
              name="flag-variant-outline"
              size={14}
              color={
                event.priority === "high"
                  ? t.danger
                  : event.priority === "medium"
                    ? "#C99639"
                    : t.muted
              }
            />
          ) : null}
          {event.due_at && (
            <DateTimeField
              compact
              mode="date"
              label={"Change due date for " + event.title}
              value={dayKey(new Date(event.due_at), p.timezone)}
              displayLabel={
                dueToday
                  ? displayTime(event.due_at, p.timezone, p.hour24)
                  : displayDate(event.due_at, p.timezone)
              }
              color={overdue ? t.danger : t.muted}
              onChangeText={(date) =>
                void perform(() => changeDueDate(event.id, date))
              }
            />
          )}
        </View>
      </View>
      {event.subtasks.length ? (
        <Disclosure open={expanded}>
          <View
            style={{
              marginLeft: 44,
              marginTop: 2,
              marginBottom: 5,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: t.subtle,
            }}
          >
            {event.subtasks.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="checkbox"
                aria-checked={s.completed}
                accessibilityState={{ checked: s.completed }}
                accessibilityLabel={s.title}
                onPress={() =>
                  void perform(() => toggleSubtask(event.id, s.id))
                }
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <Icon
                  name={
                    s.completed ? "checkbox-marked" : "checkbox-blank-outline"
                  }
                  size={18}
                />
                <Text
                  style={{
                    fontSize: 14,
                    flex: 1,
                    textDecorationLine: s.completed ? "line-through" : "none",
                  }}
                >
                  {s.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </Disclosure>
      ) : null}
    </View>
  );
}

export function EventRow({
  occurrence,
  highlight = true,
  onOpen,
  disabled = false,
}: {
  occurrence: Occurrence;
  highlight?: boolean;
  onOpen?(occurrence: Occurrence): void;
  disabled?: boolean;
}) {
  const { courses, preferences: p } = useWorkspace();
  const t = useTheme();
  const event = occurrence.event;
  const course = courses.find((c) => c.id === event.course_id);
  const significant = event.kind === "exam" && p.highlight_exams && highlight;
  const color = significant ? t.danger : course?.color || t.accent;
  const lecture = event.kind === "lecture" && !event.custom_type;
  const title = lecture && course ? course.name : event.title;
  const subtitle = lecture
    ? course && event.title !== typeLabel(event)
      ? event.title
      : undefined
    : course?.name;
  const time = occurrence.starts_at
    ? `${displayTime(occurrence.starts_at, p.timezone, p.hour24)} – ${displayTime(occurrence.ends_at!, p.timezone, p.hour24)}`
    : occurrence.due_at
      ? `Due ${displayTime(occurrence.due_at, p.timezone, p.hour24)}`
      : "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${event.title}`}
      disabled={disabled}
      onPress={() =>
        onOpen
          ? onOpen(occurrence)
          : router.push({
              pathname: "/event/[id]",
              params: { id: event.id, date: occurrence.original_date || "" },
            })
      }
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 18,
        paddingVertical: 20,
        paddingHorizontal: significant ? 16 : 0,
        backgroundColor: significant
          ? blend(t.danger, t.background, 0.11)
          : pressed
            ? t.subtle
            : "transparent",
        borderRadius: 14,
        opacity: event.completed ? 0.55 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: color,
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          name={
            significant
              ? "file-document-outline"
              : course?.icon || kindIcons[event.kind]
          }
          size={23}
          color="#FFF"
        />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{ fontWeight: "600", fontSize: 17, flexShrink: 1 }}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        {subtitle && subtitle !== title ? (
          <Text muted numberOfLines={1} style={{ fontSize: 13 }}>
            {subtitle}
          </Text>
        ) : null}
        <Text muted style={{ fontSize: 14 }}>
          {time}
          {event.location ? ` · ${event.location}` : ""}
        </Text>
        {event.kind === "exam" || event.kind === "quiz" || lecture ? (
          <Text
            style={{
              fontSize: 11,
              lineHeight: 16,
              color: lecture ? t.muted : color,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {typeLabel(event)}
            {event.parent_event_id ? " · In class" : ""}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
