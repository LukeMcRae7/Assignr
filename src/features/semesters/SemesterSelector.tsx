import { useState } from "react";
import { View } from "react-native";
import { format, parseISO } from "date-fns";
import { Semester } from "../../domain/model";
import { semesterStatus } from "../../domain/semesters";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import { Button, Chip, IconButton, Sheet, Text } from "../../ui/primitives";
import { SemesterEditor } from "./SemesterEditor";

export function SemesterSelector() {
  const w = useWorkspace();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<Semester | "new" | null>(null);
  if (editor)
    return (
      <SemesterEditor
        semester={editor === "new" ? undefined : editor}
        onClose={() => setEditor(null)}
        onSaved={(s) => {
          if (editor === "new") w.selectSemester(s.id);
        }}
      />
    );
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Button
          variant="ghost"
          icon="calendar-range"
          onPress={() => setOpen(true)}
        >
          {w.selectedSemester?.name || "Semesters"}
        </Button>
      </View>
      {open ? (
        <Sheet visible title="Semesters" onClose={() => setOpen(false)}>
          {(["Current", "Upcoming", "Past"] as const).map((status) => {
            const items = w.semesters.filter(
              (s) => semesterStatus(s) === status,
            );
            return items.length ? (
              <View key={status} style={{ gap: 10 }}>
                <Text muted style={{ fontSize: 13 }}>
                  {status}
                </Text>
                {items.map((s) => (
                  <View
                    key={s.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Chip
                        selected={w.selectedSemester?.id === s.id}
                        onPress={() => {
                          w.selectSemester(s.id);
                          setOpen(false);
                        }}
                      >
                        {s.name}
                      </Chip>
                      <Text muted style={{ fontSize: 12 }}>
                        {format(parseISO(s.start_date), "MMM d, yyyy")} –{" "}
                        {format(parseISO(s.end_date), "MMM d, yyyy")}
                      </Text>
                    </View>
                    <IconButton
                      icon="pencil-outline"
                      label={`Edit ${s.name}`}
                      onPress={() => {
                        setOpen(false);
                        setEditor(s);
                      }}
                    />
                  </View>
                ))}
              </View>
            ) : null;
          })}
          <Button
            variant="secondary"
            icon="plus"
            onPress={() => {
              setOpen(false);
              setEditor("new");
            }}
          >
            Add semester
          </Button>
        </Sheet>
      ) : null}
    </>
  );
}
