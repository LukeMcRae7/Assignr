import { useState } from "react";
import { Pressable, View } from "react-native";
import { Course, COURSE_COLORS, COURSE_ICONS } from "../../domain/model";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import { Button, Field, formRow, Icon, Sheet, Text } from "../../ui/primitives";
import { useTheme } from "../../ui/theme";

export function CourseEditor({
  course,
  onClose,
  onSaved,
}: {
  course?: Course;
  onClose(): void;
  onSaved?(course: Course): void;
}) {
  const { base, courses, saveCourse } = useWorkspace();
  const t = useTheme();
  const [draft, setDraft] = useState<Course>(
    () =>
      course || {
        ...base(),
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
  const patch = (value: Partial<Course>) =>
    setDraft((d) => ({ ...d, ...value }));
  async function save() {
    setBusy(true);
    setError("");
    try {
      await saveCourse(draft);
      onSaved?.(draft);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save course.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      visible
      title={course ? "Edit course" : "New course"}
      onClose={onClose}
      footer={
        <Button
          onPress={() => {
            void save();
          }}
          busy={busy}
        >
          {course ? "Save course" : "Create course"}
        </Button>
      }
    >
      <Field
        label="Course name"
        placeholder="e.g. Data Structures"
        value={draft.name}
        onChangeText={(name) => patch({ name })}
        autoFocus
        maxLength={120}
      />
      <View style={formRow}>
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
      </View>
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
      {!course ? (
        <Text muted style={{ fontSize: 13 }}>
          You can add your weekly classes after creating the course.
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: t.danger, fontSize: 14 }}
        >
          {error}
        </Text>
      ) : null}
    </Sheet>
  );
}
