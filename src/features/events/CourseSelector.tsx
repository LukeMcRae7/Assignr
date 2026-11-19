import { Keyboard, Pressable, View } from "react-native";
import { Course } from "../../domain/model";
import { Icon, Text } from "../../ui/primitives";
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
  return (
    <View testID="editor-course" style={{ gap: 6 }}>
      <Text muted style={{ fontSize: 12 }}>
        Course
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {[null, ...courses].map((course) => {
          const active = selected?.id === course?.id;
          const color = course?.color || t.accent;
          return (
            <Pressable
              key={course?.id || "personal"}
              accessibilityRole="button"
              accessibilityLabel={course ? "Course " + course.name : "Personal"}
              accessibilityState={{ selected: active }}
              aria-pressed={active}
              onPress={() => {
                Keyboard.dismiss();
                onSelect(course?.id || null);
              }}
              style={{
                minWidth: 44,
                height: 44,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: active ? color : "transparent",
                backgroundColor: active
                  ? blend(color, t.background, 0.17)
                  : t.surface,
              }}
            >
              <Icon
                name={course?.icon || "account-outline"}
                size={22}
                color={active ? color : t.muted}
              />
            </Pressable>
          );
        })}
      </View>
      <Text muted style={{ fontSize: 12 }}>
        {selected?.code || selected?.name || "Personal"}
      </Text>
    </View>
  );
}
