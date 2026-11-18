import { useState } from "react";
import { Pressable, View } from "react-native";
import { Course, COURSE_COLORS, COURSE_ICONS } from "../../domain/model";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import {
  Button,
  Chip,
  Field,
  FormRow,
  Icon,
  Sheet,
  Text,
} from "../../ui/primitives";
import { useTheme } from "../../ui/theme";
import { SemesterEditor } from "../semesters/SemesterEditor";
import { useDraftGuard } from "../../ui/useDraftGuard";

export function CourseEditor({
  course,
  onClose,
  onSaved,
}: {
  course?: Course;
  onClose(): void;
  onSaved?(course: Course): void;
}) {
  const {
    base,
    courses,
    semesters,
    selectedSemester,
    selectSemester,
    events,
    saveCourse,
  } = useWorkspace();
  const [creatingSemester, setCreatingSemester] = useState(!semesters.length);
  const t = useTheme();
  const [draft, setDraft] = useState<Course>(
    () =>
      course || {
        ...base(),
        semester_id: selectedSemester?.id || null,
        name: "",
        code: "",
        professor: "",
        website: "",
        color: COURSE_COLORS[courses.length % COURSE_COLORS.length],
        icon: "book-open-variant",
        position: courses.length,
      },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [initial] = useState(() => JSON.stringify(draft));
  const guard = useDraftGuard(
    !creatingSemester && initial !== JSON.stringify(draft),
    busy,
    onClose,
  );
  const patch = (value: Partial<Course>) =>
    setDraft((d) => ({ ...d, ...value }));
  const semester = semesters.find((s) => s.id === draft.semester_id);
  if (creatingSemester)
    return (
      <SemesterEditor
        onClose={() => setCreatingSemester(false)}
        onSaved={(s) => {
          patch({ semester_id: s.id });
          selectSemester(s.id);
          setCreatingSemester(false);
        }}
      />
    );
  async function save() {
    setBusy(true);
    setError("");
    try {
      await saveCourse(draft);
      guard.finish(() => {
        onSaved?.(draft);
        onClose();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save course.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Sheet
        visible
        title={course ? "Edit course" : "New course"}
        onClose={guard.requestClose}
        action={
          <Button
            compact
            label={course ? "Save course" : "Create course"}
            onPress={() => {
              void save();
            }}
            busy={busy}
          >
            {course ? "Save" : "Create"}
          </Button>
        }
      >
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "600" }}>Semester</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {semesters.map((s) => (
              <Chip
                key={s.id}
                selected={s.id === draft.semester_id}
                onPress={() => patch({ semester_id: s.id })}
              >
                {s.name}
              </Chip>
            ))}
          </View>
          <Button
            variant="ghost"
            icon="plus"
            onPress={() => setCreatingSemester(true)}
          >
            New semester
          </Button>
          {course &&
          course.semester_id !== draft.semester_id &&
          events.some((e) => e.course_id === course.id && e.recurrence) ? (
            <View style={{ gap: 8 }}>
              <Text muted style={{ fontSize: 12 }}>
                New: {semester?.name} · {semester?.start_date} –{" "}
                {semester?.end_date}
              </Text>
              <Text muted style={{ fontSize: 13 }}>
                Saving applies this semester’s teaching dates and timezone to
                existing regular classes. Individual class changes will be kept.
              </Text>
              {events
                .filter((e) => e.course_id === course.id && e.recurrence)
                .map((e) => (
                  <Text key={e.id} muted style={{ fontSize: 12 }}>
                    Previously: {e.recurrence!.start_date} –{" "}
                    {e.recurrence!.end_date} ·{" "}
                    {e.recurrence!.timezone.replaceAll("_", " ")}
                  </Text>
                ))}
            </View>
          ) : null}
        </View>
        <Field
          label="Course name"
          placeholder="e.g. Data Structures"
          value={draft.name}
          onChangeText={(name) => patch({ name })}
          maxLength={120}
        />
        <FormRow>
          <Field
            label="Course code"
            placeholder="CMPT 225"
            value={draft.code}
            onChangeText={(code) => patch({ code })}
          />
          <Field
            label="Professor"
            placeholder="Optional"
            value={draft.professor}
            onChangeText={(professor) => patch({ professor })}
          />
        </FormRow>
        <Field
          label="Course website"
          placeholder="https://"
          autoCapitalize="none"
          keyboardType="url"
          value={draft.website}
          onChangeText={(website) => patch({ website })}
        />
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "600" }}>Color</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {COURSE_COLORS.map((color) => (
              <Pressable
                key={color}
                accessibilityRole="button"
                accessibilityLabel={`Course color ${color}`}
                accessibilityState={{ selected: draft.color === color }}
                onPress={() => patch({ color })}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: color,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: draft.color === color ? 3 : 0,
                  borderColor: t.text,
                }}
              >
                {draft.color === color ? (
                  <Icon name="check" color="#FFFFFF" size={20} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "600" }}>Icon</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {COURSE_ICONS.map((icon) => (
              <Pressable
                key={icon}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${icon} icon`}
                accessibilityState={{ selected: draft.icon === icon }}
                onPress={() => patch({ icon })}
                style={{
                  width: 48,
                  height: 48,
                  borderWidth: 1,
                  borderColor: draft.icon === icon ? draft.color : t.border,
                  backgroundColor: t.surface,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name={icon}
                  color={draft.icon === icon ? draft.color : t.muted}
                />
              </Pressable>
            ))}
          </View>
        </View>
        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ color: t.danger, fontSize: 14 }}
          >
            {error}
          </Text>
        ) : null}
      </Sheet>
      {guard.confirmation}
    </>
  );
}
