import { useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { addDateDays, dayKey, weekday } from "../../domain/dates";
import { assignmentsByDueDate } from "../../domain/schedule";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import { AssignmentRow } from "../events/EventRows";
import {
  Button,
  Chip,
  EmptyState,
  Fab,
  Icon,
  IconButton,
  Screen,
  Sheet,
  Text,
} from "../../ui/primitives";
import { useTheme } from "../../ui/theme";
import { EventEditor } from "../events/EventEditor";
import { CourseEditor } from "../courses/CourseEditor";
import { Course, StudyEvent } from "../../domain/model";
import {
  defaultSemester,
  groupAssignmentsBySemester,
  semesterStatus,
} from "../../domain/semesters";

export function AssignmentsScreen() {
  const {
    courses,
    semesters,
    events,
    preferences: p,
    updatePreferences,
    perform,
  } = useWorkspace();
  const { width } = useWindowDimensions();
  const [draftNumber, setDraftNumber] = useState(0);
  const [composing, setComposing] = useState(false);
  const [filters, setFilters] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [period, setPeriod] = useState("All");
  const [priority, setPriority] = useState(false);
  const [newCourse, setNewCourse] = useState(false);
  const allAssignments = useMemo(
    () =>
      assignmentsByDueDate(events, completed).filter(
        (e) => !priority || e.priority === "high",
      ),
    [events, completed, priority],
  );
  const now = new Date();
  const today = dayKey(now, p.timezone);
  const weekEnd = addDateDays(today, 6 - ((weekday(today) + 6) % 7));
  const visible = allAssignments.filter((event) => {
    if (width < 1100 || period === "All") return true;
    if (!event.due_at) return false;
    if (period === "Overdue")
      return !event.completed && event.due_at < now.toISOString();
    const due = dayKey(new Date(event.due_at), p.timezone);
    return period === "Today" ? due === today : due >= today && due <= weekEnd;
  });
  const defaultTerm = defaultSemester(semesters, now);
  const currentTerm =
    defaultTerm && semesterStatus(defaultTerm, now) !== "Past"
      ? defaultTerm
      : null;
  const { primary: assignments, others } = groupAssignmentsBySemester(
    visible,
    courses,
    semesters,
    currentTerm?.id,
  );
  const create = () =>
    width >= 1100
      ? setComposing(true)
      : router.push({
          pathname: "/event/new",
          params: { semesterId: defaultTerm?.id },
        });
  return (
    <Screen
      title="ToDo"
      fluid={width >= 1100}
      aside={
        composing || width >= 1100 ? (
          <EventEditor
            key={draftNumber}
            quickEntry={{
              expanded: composing,
              expand: () => setComposing(true),
            }}
            semesterId={defaultTerm?.id}
            kind="assignment"
            context="assignments"
            presentation="inline"
            onClose={() => {
              setComposing(false);
              setDraftNumber((n) => n + 1);
            }}
          />
        ) : undefined
      }
      actions={
        <>
          {width >= 1100
            ? ["All", "Overdue", "Today", "This week"].map((label) => (
                <Chip
                  key={label}
                  selected={period === label}
                  onPress={() => setPeriod(label)}
                >
                  {label}
                </Chip>
              ))
            : null}
          <IconButton
            label="Flat assignment list"
            icon="format-list-bulleted"
            selected={!p.group_assignments}
            onPress={() => {
              void perform(() =>
                updatePreferences({ group_assignments: false }),
              );
            }}
          />
          <IconButton
            label="Group by course"
            icon="view-grid-outline"
            selected={p.group_assignments}
            onPress={() => {
              void perform(() =>
                updatePreferences({ group_assignments: true }),
              );
            }}
          />
          <IconButton
            label="Filter assignments"
            icon="filter-variant"
            selected={completed || priority}
            onPress={() => setFilters(true)}
          />
        </>
      }
      floating={
        width < 1100 && (courses.length || events.length) ? (
          <Fab label="Add assignment" onPress={create} />
        ) : undefined
      }
    >
      {!courses.length && !events.length ? (
        <EmptyState
          icon="school-outline"
          title="Create your first course"
          description="Start with a course to organize your classes and assignments."
          action={
            <Button icon="plus" onPress={() => setNewCourse(true)}>
              Create your first course
            </Button>
          }
        />
      ) : !visible.length ? (
        <EmptyState
          icon="check-all"
          title={
            width >= 1100 && period !== "All"
              ? "No assignments in this view"
              : priority
                ? "No high-priority assignments"
                : "You’re all caught up"
          }
          description={
            priority
              ? "Change your filters to see more assignments."
              : undefined
          }
        />
      ) : assignments.length ? (
        <AssignmentList
          assignments={assignments}
          courses={courses}
          grouped={p.group_assignments}
        />
      ) : null}
      {others.map(({ semester, assignments }) => (
        <View key={semester.id} style={{ gap: 8 }}>
          <Text
            muted
            accessibilityRole="header"
            style={{ fontSize: 15, fontWeight: "600" }}
          >
            {semester.name}
          </Text>
          <AssignmentList
            assignments={assignments}
            courses={courses}
            grouped={p.group_assignments}
          />
        </View>
      ))}
      {filters ? (
        <Sheet
          visible
          title="Assignment filters"
          onClose={() => setFilters(false)}
        >
          <Chip selected={completed} onPress={() => setCompleted(!completed)}>
            Include completed
          </Chip>
          <Chip selected={priority} onPress={() => setPriority(!priority)}>
            High priority only
          </Chip>
          <Button onPress={() => setFilters(false)}>Done</Button>
        </Sheet>
      ) : null}
      {newCourse ? (
        <CourseEditor
          onClose={() => setNewCourse(false)}
          onSaved={(course) => router.push(`/courses/${course.id}`)}
        />
      ) : null}
    </Screen>
  );
}

function AssignmentList({
  assignments,
  courses,
  grouped,
}: {
  assignments: StudyEvent[];
  courses: Course[];
  grouped: boolean;
}) {
  const t = useTheme();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = [
    ...courses.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
    })),
    {
      id: "personal",
      name: "Personal",
      icon: "notebook-outline",
      color: t.accent,
    },
  ]
    .map((c) => ({
      ...c,
      assignments: assignments.filter(
        (e) => (e.course_id || "personal") === c.id,
      ),
    }))
    .filter((c) => c.assignments.length);
  return grouped ? (
    <View style={{ gap: 18 }}>
      {groups.map((group) => {
        const closed = collapsed.has(group.id);
        return (
          <View
            key={group.id}
            style={{
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 16,
              overflow: "hidden",
              borderLeftWidth: 4,
              borderLeftColor: group.color,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${closed ? "Expand" : "Collapse"} ${group.name}`}
              accessibilityState={{ expanded: !closed }}
              aria-expanded={!closed}
              onPress={() =>
                setCollapsed((old) => {
                  const next = new Set(old);
                  if (next.has(group.id)) next.delete(group.id);
                  else next.add(group.id);
                  return next;
                })
              }
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 13,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: t.surface,
                }}
              >
                <Icon name={group.icon} size={23} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 9,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "600",
                      flexShrink: 1,
                    }}
                  >
                    {group.name}
                  </Text>
                  <View
                    style={{
                      borderRadius: 8,
                      backgroundColor: t.elevated,
                      paddingHorizontal: 8,
                    }}
                  >
                    <Text muted style={{ fontSize: 12 }}>
                      {group.assignments.length}
                    </Text>
                  </View>
                </View>
              </View>
              <Icon name={closed ? "chevron-down" : "chevron-up"} size={22} />
            </Pressable>
            {!closed ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                {group.assignments.map((event) => (
                  <AssignmentRow key={event.id} event={event} />
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  ) : (
    <View>
      {assignments.map((event) => (
        <View
          key={event.id}
          style={{ borderBottomWidth: 1, borderColor: t.border }}
        >
          <AssignmentRow event={event} showCourse />
        </View>
      ))}
    </View>
  );
}
