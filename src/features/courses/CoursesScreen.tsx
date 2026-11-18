import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Course } from "../../domain/model";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import {
  Button,
  EmptyState,
  Fab,
  Icon,
  IconButton,
  Screen,
  Text,
} from "../../ui/primitives";
import { blend, useTheme } from "../../ui/theme";
import { CourseEditor } from "./CourseEditor";
import { SemesterSelector } from "../semesters/SemesterSelector";

export function CoursesScreen() {
  const {
    courses: allCourses,
    selectedSemester,
    commit,
    perform,
  } = useWorkspace();
  const courses = allCourses.filter(
    (c) => c.semester_id === selectedSemester?.id,
  );
  const unassigned = allCourses.filter((c) => !c.semester_id);
  const [assigning, setAssigning] = useState<Course | null>(null);
  const { width } = useWindowDimensions();
  const t = useTheme();
  const [editing, setEditing] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  function move(course: Course, direction: number) {
    const index = courses.findIndex((c) => c.id === course.id);
    const other = courses[index + direction];
    if (!other) return;
    void perform(() =>
      commit([
        {
          table: "courses",
          record: { ...course, position: index + direction },
        },
        { table: "courses", record: { ...other, position: index } },
      ]),
    );
  }
  return (
    <Screen
      title="Courses"
      actions={
        courses.length > 1 ? (
          <IconButton
            icon={organizing ? "check" : "sort-variant"}
            label={organizing ? "Done organizing" : "Organize courses"}
            selected={organizing}
            onPress={() => setOrganizing(!organizing)}
          />
        ) : undefined
      }
      floating={
        allCourses.length ? (
          <Fab label="Add course" onPress={() => setEditing(true)} />
        ) : undefined
      }
    >
      <SemesterSelector />
      {unassigned.length ? (
        <View style={{ gap: 10 }}>
          <Text style={{ fontWeight: "600" }}>
            Assign your existing courses
          </Text>
          <Text muted style={{ fontSize: 13 }}>
            Their schedules stay unchanged until you choose a semester.
          </Text>
          {unassigned.map((c) => (
            <Button
              key={c.id}
              variant="secondary"
              onPress={() => setAssigning(c)}
            >
              Assign semester · {c.name}
            </Button>
          ))}
        </View>
      ) : null}
      {!courses.length ? (
        <EmptyState
          icon="school-outline"
          title={
            allCourses.length
              ? "No courses in this semester"
              : "Make room for a great term"
          }
          description={
            allCourses.length
              ? "Add a course here, or switch semesters to see your other courses."
              : "Start with a course. Add its weekly classes and keep every deadline connected."
          }
          action={
            <Button icon="plus" onPress={() => setEditing(true)}>
              {allCourses.length ? "Add course" : "Create your first course"}
            </Button>
          }
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
          {courses.map((course, index) => (
            <View
              key={course.id}
              style={{ width: width >= 1100 ? "48%" : "100%" }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${course.name}`}
                onPress={() => router.push(`/courses/${course.id}`)}
                style={({ pressed }) => ({
                  backgroundColor: blend(
                    course.color,
                    "#111111",
                    t.dark ? 0.68 : 0.9,
                  ),
                  borderRadius: 18,
                  minHeight: 148,
                  overflow: "hidden",
                  borderLeftWidth: 5,
                  borderLeftColor: course.color,
                  opacity: pressed ? 0.85 : 1,
                  padding: 22,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 18,
                })}
              >
                <View
                  style={{
                    position: "absolute",
                    right: -14,
                    bottom: -25,
                    opacity: 0.09,
                    transform: [{ rotate: "-16deg" }],
                  }}
                >
                  <Icon name={course.icon} size={160} color="#FFF" />
                </View>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 13,
                    backgroundColor: "#00000018",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={course.icon} size={27} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      lineHeight: 26,
                      fontWeight: "600",
                      color: "#FFFFFF",
                    }}
                  >
                    {course.name}
                  </Text>
                  {course.code ? (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <Icon name="tag" size={15} color="#FFFFFFBA" />
                      <Text style={{ color: "#FFFFFFCD", fontSize: 14 }}>
                        {course.code}
                      </Text>
                    </View>
                  ) : null}
                  {course.professor ? (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <Icon name="account" size={16} color="#FFFFFFBA" />
                      <Text style={{ color: "#FFFFFFCD", fontSize: 14 }}>
                        {course.professor}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
              {organizing ? (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    paddingTop: 3,
                  }}
                >
                  <IconButton
                    icon="arrow-up"
                    label={`Move ${course.name} up`}
                    disabled={!index}
                    onPress={() => move(course, -1)}
                  />
                  <IconButton
                    icon="arrow-down"
                    label={`Move ${course.name} down`}
                    disabled={index === courses.length - 1}
                    onPress={() => move(course, 1)}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
      {assigning ? (
        <CourseEditor course={assigning} onClose={() => setAssigning(null)} />
      ) : null}
      {editing ? (
        <CourseEditor
          onClose={() => setEditing(false)}
          onSaved={(c) => router.push(`/courses/${c.id}`)}
        />
      ) : null}
    </Screen>
  );
}
