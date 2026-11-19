import { useMemo } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { EventKind, StudyEvent } from "../../domain/model";
import {
  categoryForKind,
  editorKinds,
  EventContext,
  kindLabels,
  usedTypes,
} from "../../domain/eventEditor";
import { Chip, Field, Text } from "../../ui/primitives";

import { useTheme } from "../../ui/theme";

const categories = [
  ["assignments", "Assignments", "assignment"],
  ["assessments", "Assessments", "exam"],
  ["classes", "Schedule", "activity"],
] as const;

export function EventTypePicker({
  context,
  draft,
  existingKind,
  events,
  naming,
  select,
  setName,
}: {
  context: EventContext;
  draft: StudyEvent;
  existingKind?: EventKind;
  events: StudyEvent[];
  naming: boolean;
  select(kind: EventKind, customName?: string | null): void;
  setName(name: string): void;
}) {
  const t = useTheme();
  const category = categoryForKind(draft.kind);
  const existing =
    existingKind && categoryForKind(existingKind) === category
      ? existingKind
      : undefined;
  const kinds = editorKinds(category, existing);
  if (
    category === "classes" &&
    context === "general" &&
    !kinds.includes("activity")
  )
    kinds.unshift("activity");
  const existingTypes = useMemo(() => usedTypes(events), [events]);
  const custom = existingTypes.filter(
    (e) => e.custom_type && categoryForKind(e.kind) === category,
  );
  const row = { flexDirection: "row", flexWrap: "wrap", gap: 4 } as const;
  return (
    <>
      {context === "general" ? (
        <View
          style={{
            flexDirection: "row",
            backgroundColor: t.subtle,
            padding: 3,
            borderRadius: 10,
          }}
        >
          {categories.map(([key, label, kind]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: category === key }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 38,
                borderRadius: 8,
                backgroundColor: category === key ? t.elevated : "transparent",
              }}
              onPress={() => {
                Keyboard.dismiss();
                if (key !== category) select(kind);
              }}
            >
              <Text
                muted={category !== key}
                style={{
                  fontSize: 13,
                  fontWeight: category === key ? "700" : "500",
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View testID="editor-types" style={row}>
        {kinds.map((kind) => (
          <Chip
            key={kind}
            selected={draft.kind === kind && draft.custom_type == null}
            onPress={() => select(kind)}
          >
            {kindLabels[kind]}
          </Chip>
        ))}
        {custom.map((event) => (
          <Chip
            key={event.custom_type}
            selected={
              !naming &&
              event.custom_type?.toLowerCase() ===
                draft.custom_type?.toLowerCase()
            }
            onPress={() => select(event.kind, event.custom_type)}
          >
            {event.custom_type}
          </Chip>
        ))}
        <Chip
          selected={naming}
          onPress={() =>
            select(
              category === "assignments"
                ? "assignment"
                : category === "assessments"
                  ? "quiz"
                  : "lecture",
              "",
            )
          }
        >
          Other
        </Chip>
      </View>
      {naming ? (
        <Field
          label="Type name"
          placeholder={
            category === "classes"
              ? "e.g. Workshop"
              : category === "assessments"
                ? "e.g. Presentation"
                : "e.g. Reading"
          }
          maxLength={40}
          value={draft.custom_type || ""}
          onChangeText={setName}
        />
      ) : null}
    </>
  );
}
