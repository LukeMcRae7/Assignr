import { useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
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
import { SemesterSelector } from "../semesters/SemesterSelector";
import { semesterStatus } from "../../domain/semesters";

export function AssignmentsScreen() {
  const {
    courses,
    semesters,
    selectedSemester,
    events,
    preferences: p,
    updatePreferences,
    perform,
  } = useWorkspace();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [composing, setComposing] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [priority, setPriority] = useState(false);
  const [newCourse, setNewCourse] = useState(false);
  const allAssignments = useMemo(
    () =>
      assignmentsByDueDate(events, completed).filter(
        (e) => !priority || e.priority === "high",
      ),
    [events, completed, priority],
  );
  const courseSemester = (courseId: string | null) =>
    courses.find((c) => c.id === courseId)?.semester_id;
  const assignments = allAssignments.filter(
    (e) =>
      !courseSemester(e.course_id) ||
      courseSemester(e.course_id) === selectedSemester?.id,
  );
  const pastAssignments = allAssignments.filter((e) => {
    const semester = semesters.find(
      (s) => s.id === courseSemester(e.course_id),
    );
    return (
      !e.completed &&
      semester &&
      semester.id !== selectedSemester?.id &&
      semesterStatus(semester) === "Past"
    );
  });
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
  const create = () =>
    width >= 1100 ? setComposing(true) : router.push("/event/new");
  return (
    <Screen
      title="ToDo"
      aside={
        composing ? (
          <EventEditor
            kind="assignment"
            context="assignments"
            presentation="inline"
            onClose={() => setComposing(false)}
          />
        ) : width >= 1100 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add assignment"
            onPress={() => setComposing(true)}
            style={{
              minHeight: 52,
              padding: 16,
              borderRadius: 12,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            <Text muted style={{ fontSize: 14 }}>
              Add assignment
            </Text>
          </Pressable>
        ) : undefined
      }
      actions={
        <>
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
      {semesters.length ? <SemesterSelector /> : null}
      {!courses.length && !events.length ? (
        <EmptyState
          icon="school-outline"
          title="A little structure. A clearer day."
          description="Add your first course, then bring your classes, deadlines, and plans into one place."
          action={
            <Button icon="plus" onPress={() => setNewCourse(true)}>
              Create your first course
            </Button>
          }
        />
      ) : !assignments.length ? (
        <EmptyState
          icon="check-all"
          title={
            priority
              ? "No high-priority assignments"
              : pastAssignments.length
                ? "No assignments in this semester"
                : "You’re all caught up"
          }
          description={
            priority
              ? "Change your filters to see more assignments."
              : "Your next assignment will appear here. Enjoy the breathing room."
          }
          action={
            <Button variant="secondary" icon="plus" onPress={create}>
              Add assignment
            </Button>
          }
        />
      ) : p.group_assignments ? (
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
                    padding: 18,
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
                    <Text muted style={{ fontSize: 12 }}>
                      {closed ? "Tap to view assignments" : "Tap to collapse"}
                    </Text>
                  </View>
                  <Icon
                    name={closed ? "chevron-down" : "chevron-up"}
                    size={22}
                  />
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
      )}
      {pastAssignments.length ? (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: "600" }}>
            Unfinished from past semesters
          </Text>
          {pastAssignments.map((event) => (
            <AssignmentRow key={event.id} event={event} showCourse />
          ))}
        </View>
      ) : null}
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
