import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { displayDate, displayWallTime } from "../../domain/dates";
import { assignmentsByDueDate } from "../../domain/schedule";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import {
  Button,
  Chip,
  Confirm,
  EmptyState,
  Icon,
  IconButton,
  Panel,
  SectionTitle,
  Text,
} from "../../ui/primitives";
import { blend, useTheme } from "../../ui/theme";
import { CourseEditor } from "./CourseEditor";
import { AssignmentRow } from "../events/EventRows";

export function CourseDetailScreen({ id }: { id: string }) {
  const {
    courses,
    events,
    preferences: p,
    deleteCourse,
    perform,
  } = useWorkspace();
  const t = useTheme();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const course = courses.find((c) => c.id === id);
  if (!course)
    return (
      <EmptyState
        title="Course unavailable"
        description="This course may have been deleted on another device."
        action={
          <Button onPress={() => router.replace("/courses")}>
            Back to courses
          </Button>
        }
      />
    );
  const courseEvents = events.filter((e) => e.course_id === id && !e.cancelled);
  const assignments = assignmentsByDueDate(courseEvents);
  const classes = courseEvents.filter((e) => e.recurrence);
  const exams = courseEvents
    .filter((e) => e.kind === "exam" || e.kind === "quiz")
    .sort((a, b) =>
      (a.starts_at || a.due_at || "").localeCompare(
        b.starts_at || b.due_at || "",
      ),
    );
  const create = (kind: string) =>
    router.push({ pathname: "/event/new", params: { courseId: id, kind } });
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: t.background }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View
          style={{
            backgroundColor: blend(course.color, "#111111", 0.9),
            paddingHorizontal: 20,
            paddingVertical: 28,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 1000,
              alignSelf: "center",
              flexDirection: "row",
              gap: 18,
              alignItems: "center",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to courses"
              onPress={() => router.back()}
              style={{ padding: 8 }}
            >
              <Icon name="chevron-left" color="#FFF" size={30} />
            </Pressable>
            <View
              style={{
                backgroundColor: "#FFFFFF22",
                width: 58,
                height: 58,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={course.icon} color="#FFF" size={33} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  fontSize: 26,
                  lineHeight: 32,
                  fontWeight: "700",
                  color: "#FFF",
                }}
              >
                {course.name}
              </Text>
              <Text style={{ color: "#FFFFFFCC" }}>{course.code}</Text>
            </View>
          </View>
        </View>
        <View
          style={{
            width: "100%",
            maxWidth: 1000,
            alignSelf: "center",
            padding: 24,
            gap: 24,
          }}
        >
          {course.professor ? (
            <View
              style={{ flexDirection: "row", gap: 14, alignItems: "center" }}
            >
              <Icon name="account" />
              <Text>{course.professor}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Icon name="calendar-clock-outline" />
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {classes.length ? (
                classes.map((e) => (
                  <Chip
                    key={e.id}
                    onPress={() => router.push(`/event/${e.id}`)}
                  >
                    {e
                      .recurrence!.days.map(
                        (d) => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d],
                      )
                      .join(", ")}{" "}
                    {displayWallTime(e.recurrence!.start_time, p.hour24)}
                  </Chip>
                ))
              ) : (
                <Text muted style={{ fontSize: 14 }}>
                  No weekly classes yet
                </Text>
              )}
            </View>
          </View>
          {course.website ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void perform(() => Linking.openURL(course.website));
              }}
              style={{ flexDirection: "row", gap: 14, alignItems: "center" }}
            >
              <Icon name="earth" />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: t.accent,
                  fontSize: 14,
                  textDecorationLine: "underline",
                }}
              >
                {course.website}
              </Text>
            </Pressable>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { kind: "assignment", label: "Add assignment", icon: "plus" },
              {
                kind: "exam",
                label: "Add exam",
                icon: "file-document-outline",
              },
              {
                kind: "lecture",
                label: "Manage classes",
                icon: "school-outline",
              },
            ].map((action) => (
              <Pressable
                key={action.kind}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => create(action.kind)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? t.elevated : t.surface,
                  borderRadius: 15,
                  paddingVertical: 23,
                  paddingHorizontal: 8,
                  alignItems: "center",
                  gap: 10,
                })}
              >
                <Icon name={action.icon} color={t.accent} size={27} />
                <Text
                  style={{
                    fontSize: 13,
                    textAlign: "center",
                    fontWeight: "500",
                  }}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Panel>
            <SectionTitle>Assignments</SectionTitle>
            {assignments.length ? (
              assignments.map((e) => <AssignmentRow key={e.id} event={e} />)
            ) : (
              <Text
                muted
                style={{
                  textAlign: "center",
                  paddingVertical: 22,
                  fontStyle: "italic",
                }}
              >
                No assignments. A fresh start.
              </Text>
            )}
          </Panel>
          <Panel>
            <SectionTitle>Exams & quizzes</SectionTitle>
            {exams.length ? (
              exams.map((e) => (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${e.title}`}
                  onPress={() => router.push(`/event/${e.id}`)}
                  style={{
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <Icon
                    name={
                      e.kind === "exam"
                        ? "file-document-outline"
                        : "lightning-bolt-outline"
                    }
                    color={t.danger}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600" }}>{e.title}</Text>
                    <Text muted style={{ fontSize: 13 }}>
                      {e.starts_at || e.due_at
                        ? displayDate(
                            (e.starts_at || e.due_at)!,
                            p.timezone,
                            p.hour24
                              ? "MMM d, yyyy · HH:mm"
                              : "MMM d, yyyy · h:mm a",
                          )
                        : ""}
                      {e.location ? ` · ${e.location}` : ""}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} />
                </Pressable>
              ))
            ) : (
              <Text
                muted
                style={{
                  textAlign: "center",
                  paddingVertical: 22,
                  fontStyle: "italic",
                }}
              >
                No exams or quizzes scheduled
              </Text>
            )}
          </Panel>
          {classes.length ? (
            <Panel>
              <SectionTitle
                right={
                  <IconButton
                    icon="plus"
                    label="Add weekly class"
                    onPress={() => create("lecture")}
                  />
                }
              >
                Weekly classes
              </SectionTitle>
              {classes.map((e) => (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/event/${e.id}`)}
                  style={{ gap: 5 }}
                >
                  <Text style={{ fontWeight: "500" }}>{e.title}</Text>
                  <Text muted style={{ fontSize: 13 }}>
                    {e
                      .recurrence!.days.map(
                        (d) =>
                          [
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ][d],
                      )
                      .join(", ")}{" "}
                    · {displayWallTime(e.recurrence!.start_time, p.hour24)}–
                    {displayWallTime(e.recurrence!.end_time, p.hour24)}
                    {e.location ? ` · ${e.location}` : ""}
                  </Text>
                </Pressable>
              ))}
            </Panel>
          ) : null}
          <Button
            variant="secondary"
            icon="pencil-outline"
            onPress={() => setEdit(true)}
          >
            Edit course
          </Button>
          <Button variant="danger" onPress={() => setConfirm(true)}>
            Delete course
          </Button>
        </View>
      </ScrollView>
      {edit ? (
        <CourseEditor course={course} onClose={() => setEdit(false)} />
      ) : null}
      {confirm ? (
        <Confirm
          title="Delete course?"
          message={`This will delete ${course.name} and all its assignments, classes, and events from your devices.`}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            void perform(async () => {
              await deleteCourse(course);
              router.replace("/courses");
            });
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
