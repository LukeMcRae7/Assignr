import { useState } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { Course } from "../../domain/model";
import { Icon, Sheet, Text } from "../../ui/primitives";
import { blend, useTheme } from "../../ui/theme";

export function CourseSelector({
  courses,
  selected,
  onSelect,
}: {
  courses: Course[];
  selected: Course | undefined;
  onSelect(id: string | null): void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const color = selected?.color || t.muted;
  return (
    <View testID="editor-course" style={{ gap: 6 }}>
      <Text muted style={{ fontSize: 12 }}>
        Course
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose course"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        style={{
          minHeight: 44,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          borderRadius: 10,
          backgroundColor: selected
            ? blend(color, t.background, 0.12)
            : t.surface,
        }}
      >
        <Icon
          name={selected?.icon || "account-outline"}
          size={20}
          color={color}
        />
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 14, color: selected ? color : t.text }}
        >
          {selected?.name || "Personal"}
        </Text>
        <Icon name="chevron-down" size={18} />
      </Pressable>
      {selected?.code ? (
        <Text muted style={{ fontSize: 12, paddingLeft: 2 }}>
          {selected.code}
        </Text>
      ) : null}
      {open ? (
        <Sheet visible title="Choose course" onClose={() => setOpen(false)}>
          {[null, ...courses].map((course) => (
            <Pressable
              key={course?.id || "personal"}
              accessibilityRole="button"
              accessibilityLabel={course ? "Course " + course.name : "Personal"}
              accessibilityState={{ selected: course?.id === selected?.id }}
              onPress={() => {
                onSelect(course?.id || null);
                setOpen(false);
              }}
              style={{
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 8,
              }}
            >
              <Icon
                name={course?.icon || "account-outline"}
                color={course?.color || t.muted}
              />
              <Text style={{ fontSize: 14, flex: 1 }}>
                {course?.name || "Personal"}
              </Text>
              {course?.id === selected?.id ? (
                <Icon
                  name="check"
                  color={course?.color || t.accent}
                  size={18}
                />
              ) : null}
            </Pressable>
          ))}
        </Sheet>
      ) : null}
    </View>
  );
}
