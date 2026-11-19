import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { displayDate } from "../../domain/dates";
import {
  assignmentsByDueDate,
  weeklyScheduleLabel,
} from "../../domain/schedule";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import {
  Button,
  Confirm,
  EmptyState,
  Icon,
  IconButton,
  Panel,
  SectionTitle,
  Text,
} from "../../ui/primitives";
import { categoryForKind } from "../../domain/eventEditor";
import { blend, useTheme } from "../../ui/theme";
import { CourseEditor } from "./CourseEditor";
import { AssignmentRow } from "../events/EventRows";
import { exceptionsOutsideSemester } from "../../domain/semesters";
import { format, parseISO } from "date-fns";

export function CourseDetailScreen({ id }: { id: string }) {
  const {
    courses,
    semesters,
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
  const semester = semesters.find((s) => s.id === course.semester_id);
  const outside = semester
    ? exceptionsOutsideSemester(semester, [course], events)
    : [];
  const assignments = assignmentsByDueDate(courseEvents);
  const classes = courseEvents.filter(
    (e) => categoryForKind(e.kind) === "classes",
  );
  const exams = courseEvents
    .filter((e) => e.kind === "exam" || e.kind === "quiz")
    .sort((a, b) =>
      (a.starts_at || a.due_at || "").localeCompare(
        b.starts_at || b.due_at || "",
      ),
    );
  const create = (kind: string) =>
    router.push({ pathname: "/event/new", params: { courseId: id, kind } });
  const banner = blend(course.color, "#111111", 0.9);
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: banner }}
    >
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50%",
            backgroundColor: banner,
          }}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            style={{
              backgroundColor: banner,
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
          <View style={{ backgroundColor: t.background, flexGrow: 1 }}>
            <View
              style={{
                width: "100%",
                maxWidth: 1000,
                alignSelf: "center",
                padding: 24,
                gap: 24,
              }}
            >
              {semester ? (
                <Text muted style={{ fontSize: 13 }}>
                  {semester.name} ·{" "}
                  {format(parseISO(semester.start_date), "MMM d")} –{" "}
                  {format(parseISO(semester.end_date), "MMM d, yyyy")}
                </Text>
              ) : (
                <Button variant="secondary" onPress={() => setEdit(true)}>
                  Assign semester
                </Button>
              )}
              {outside.length ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: t.danger }}>
                    Review class changes outside teaching dates
                  </Text>
                  {outside.map((e) => (
                    <Button
                      key={e.id}
                      variant="ghost"
                      onPress={() => router.push(`/event/${e.id}`)}
                    >
                      {e.title} · {e.occurrence_date}
                    </Button>
                  ))}
                </View>
              ) : null}
              {course.professor ? (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <Icon name="account" />
                  <Text>{course.professor}</Text>
                </View>
              ) : null}
              {course.website ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void perform(() => Linking.openURL(course.website));
                  }}
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    alignItems: "center",
                  }}
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
              <Panel>
                <SectionTitle
                  right={
                    <IconButton
                      icon="plus"
                      label="Add assignment"
                      onPress={() => create("assignment")}
                    />
                  }
                >
                  Assignments
                </SectionTitle>
                {assignments.length ? (
                  assignments.map((e) => <AssignmentRow key={e.id} event={e} />)
                ) : (
                  <Text
                    muted
                    style={{
                      textAlign: "center",
                      paddingVertical: 3,
                    }}
                  >
                    No assignments
                  </Text>
                )}
              </Panel>
              <Panel>
                <SectionTitle
                  right={
                    <IconButton
                      icon="plus"
                      label="Add assessment"
                      onPress={() => create("exam")}
                    />
                  }
                >
                  Assessments
                </SectionTitle>
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
                            : "clipboard-check-outline"
                        }
                        color={
                          e.kind === "exam" && p.highlight_exams
                            ? t.danger
                            : course.color
                        }
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
                      paddingVertical: 3,
                    }}
                  >
                    No assessments
                  </Text>
                )}
              </Panel>
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
                  Class schedule
                </SectionTitle>
                {!classes.length ? (
                  <Text muted style={{ fontSize: 14 }}>
                    No classes scheduled
                  </Text>
                ) : null}
                {classes.map((e) => (
                  <Pressable
                    key={e.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/event/${e.id}`)}
                    style={{ gap: 5 }}
                  >
                    <Text style={{ fontWeight: "500" }}>{e.title}</Text>
                    <Text muted style={{ fontSize: 13 }}>
                      {e.recurrence
                        ? weeklyScheduleLabel(e, p.timezone, p.hour24)
                        : displayDate(
                            (e.starts_at || e.due_at)!,
                            p.timezone,
                            p.hour24 ? "MMM d · HH:mm" : "MMM d · h:mm a",
                          )}
                      {e.location ? ` · ${e.location}` : ""}
                    </Text>
                  </Pressable>
                ))}
              </Panel>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  compact
                  variant="secondary"
                  icon="pencil-outline"
                  onPress={() => setEdit(true)}
                >
                  Edit course
                </Button>
                <Button
                  compact
                  variant="ghost"
                  onPress={() => setConfirm(true)}
                >
                  Delete course
                </Button>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
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
