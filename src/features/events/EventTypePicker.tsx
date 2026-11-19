import { useMemo } from "react";
import { View } from "react-native";
import { EventKind, StudyEvent } from "../../domain/model";
import {
  categoryForKind,
  editorKinds,
  EventContext,
  kindLabels,
  usedTypes,
} from "../../domain/eventEditor";
import { Chip, Field } from "../../ui/primitives";

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
        <View style={row}>
          {categories.map(([key, label, kind]) => (
            <Chip
              key={key}
              selected={category === key}
              onPress={() => {
                if (key !== category) select(kind);
              }}
            >
              {label}
            </Chip>
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
