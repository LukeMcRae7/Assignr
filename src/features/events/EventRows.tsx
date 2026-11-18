import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { displayDate, displayTime, dayKey } from "../../domain/dates";
import { Occurrence, StudyEvent } from "../../domain/model";
import { subtaskProgress } from "../../domain/schedule";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import { Icon, Text } from "../../ui/primitives";
import { blend, useTheme } from "../../ui/theme";

export const kindIcons: Record<string, string> = {
  assignment: "clipboard-text-outline",
  exam: "file-document-outline",
  quiz: "lightning-bolt-outline",
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
  const { courses, preferences: p, toggleAssignment, perform } = useWorkspace();
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
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 15,
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${event.title}`}
        onPress={() => router.push(`/event/${event.id}`)}
        style={{ flex: 1, gap: 5, paddingVertical: 3 }}
      >
        <Text
          style={{
            fontWeight: "500",
            textDecorationLine: event.completed ? "line-through" : "none",
            color: event.completed ? t.muted : t.text,
          }}
        >
          {event.title}
        </Text>
        {showCourse ? (
          <Text muted style={{ fontSize: 12, lineHeight: 18 }}>
            {course?.name || "Personal"}
          </Text>
        ) : null}
        {event.subtasks.length ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 3,
            }}
          >
            <View
              style={{
                height: 4,
                backgroundColor: t.elevated,
                flex: 1,
                maxWidth: 140,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${progress * 100}%`,
                  backgroundColor: course?.color || t.accent,
                }}
              />
            </View>
            <Text muted style={{ fontSize: 11, lineHeight: 16 }}>
              {event.subtasks.filter((s) => s.completed).length}/
              {event.subtasks.length}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
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
        <Text style={{ fontSize: 13, color: overdue ? t.danger : t.muted }}>
          {event.due_at
            ? dueToday
              ? "Today"
              : displayDate(event.due_at, p.timezone)
            : ""}
        </Text>
        {dueToday && event.due_at ? (
          <Text muted style={{ fontSize: 11, lineHeight: 16 }}>
            {displayTime(event.due_at, p.timezone, p.hour24)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function EventRow({
  occurrence,
  highlight = true,
}: {
  occurrence: Occurrence;
  highlight?: boolean;
}) {
  const { courses, preferences: p } = useWorkspace();
  const t = useTheme();
  const event = occurrence.event;
  const course = courses.find((c) => c.id === event.course_id);
  const significant = event.kind === "exam" && p.highlight_exams && highlight;
  const color = significant ? t.danger : course?.color || t.accent;
  const time = occurrence.starts_at
    ? `${displayTime(occurrence.starts_at, p.timezone, p.hour24)} – ${displayTime(occurrence.ends_at!, p.timezone, p.hour24)}`
    : occurrence.due_at
      ? `Due ${displayTime(occurrence.due_at, p.timezone, p.hour24)}`
      : "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${event.title}`}
      onPress={() =>
        router.push({
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
            {course && event.title.toLowerCase() !== course.name.toLowerCase()
              ? `${course.name} · ${event.title}`
              : event.title}
          </Text>
        </View>
        <Text muted style={{ fontSize: 14 }}>
          {time}
          {event.location ? ` · ${event.location}` : ""}
        </Text>
        {significant || event.kind === "quiz" ? (
          <Text
            style={{
              fontSize: 11,
              lineHeight: 16,
              color,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {event.kind}
            {event.parent_event_id ? " · In class" : ""}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
