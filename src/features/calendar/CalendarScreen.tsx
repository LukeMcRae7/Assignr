import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { router } from "expo-router";
import { addDateDays, dayKey, weekday, zonedISO } from "../../domain/dates";
import { EVENT_KINDS, EventKind, Occurrence } from "../../domain/model";
import { expandEvents, occurrencesOnDate } from "../../domain/schedule";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import {
  Button,
  Chip,
  EmptyState,
  Fab,
  IconButton,
  Screen,
  SectionTitle,
  Sheet,
  Text,
} from "../../ui/primitives";
import { blend, useTheme } from "../../ui/theme";
import { EventEditor } from "../events/EventEditor";
import { EventDetail } from "../events/EventDetail";
import { EventRow } from "../events/EventRows";

const typeLabels: Record<EventKind, string> = {
  assignment: "Assignments",
  exam: "Exams",
  quiz: "Quizzes",
  lecture: "Lectures",
  tutorial: "Tutorials",
  seminar: "Seminars",
  lab: "Labs",
  activity: "Personal events",
};
export function CalendarScreen() {
  const { events, preferences: p, updatePreferences, perform } = useWorkspace();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const today = dayKey(new Date(), p.timezone);
  const [month, setMonth] = useState(startOfMonth(parseISO(today)));
  const [selected, setSelected] = useState(today);
  const [filters, setFilters] = useState(false);
  const [composing, setComposing] = useState(false);
  const [detail, setDetail] = useState<Occurrence | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const panelOpen = composing || !!detail;
  const wide = width >= 1200 && !panelOpen;
  const first = format(month, "yyyy-MM-dd");
  const gridStart = addDateDays(first, -weekday(first));
  const dates = Array.from({ length: 42 }, (_, i) => addDateDays(gridStart, i));
  const all = expandEvents(
    events,
    new Date(zonedISO(gridStart, "00:00", p.timezone)),
    new Date(zonedISO(addDateDays(gridStart, 42), "00:00", p.timezone)),
  );
  const visible = all.filter(
    (o) => p.calendar_types.includes(o.event.kind) && !o.event.completed,
  );
  const selectedEvents = occurrencesOnDate(events, selected, p.timezone).filter(
    (o) => p.calendar_types.includes(o.event.kind) && !o.event.completed,
  );
  function navigateMonth(direction: number) {
    const next = addMonths(month, direction);
    setMonth(next);
    setSelected(format(next, "yyyy-MM-dd"));
  }
  return (
    <Screen
      title="Calendar"
      aside={
        composing ? (
          <EventEditor
            context="general"
            kind="activity"
            date={selected}
            presentation="inline"
            onClose={() => setComposing(false)}
          />
        ) : detail ? (
          <EventDetail
            key={detail.key}
            id={detail.event.id}
            date={detail.original_date || undefined}
            presentation="inline"
            onEditStart={() => setDetailEditing(true)}
            onClose={() => {
              setDetail(null);
              setDetailEditing(false);
            }}
          />
        ) : undefined
      }
      actions={
        <>
          <IconButton
            icon="calendar-today"
            label="Go to today"
            onPress={() => {
              setSelected(today);
              setMonth(startOfMonth(parseISO(today)));
            }}
          />
          <IconButton
            icon="filter-variant"
            label="Calendar visibility"
            onPress={() => setFilters(true)}
          />
        </>
      }
      floating={
        !panelOpen ? (
          <Fab
            onPress={() =>
              width >= 1100
                ? setComposing(true)
                : router.push({
                    pathname: "/event/new",
                    params: {
                      date: selected,
                      kind: "activity",
                      context: "general",
                    },
                  })
            }
          />
        ) : undefined
      }
    >
      <View
        style={{
          flexDirection: wide ? "row" : "column",
          gap: 36,
          alignItems: "flex-start",
        }}
      >
        <View
          style={{
            flex: wide ? 1 : undefined,
            width: wide ? undefined : "100%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <IconButton
              icon="chevron-left"
              label="Previous month"
              onPress={() => navigateMonth(-1)}
            />
            <Text style={{ fontSize: 21, fontWeight: "600" }}>
              {format(month, "MMMM yyyy")}
            </Text>
            <IconButton
              icon="chevron-right"
              label="Next month"
              onPress={() => navigateMonth(1)}
            />
          </View>
          <View style={{ flexDirection: "row" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <View
                key={d}
                style={{
                  width: `${100 / 7}%`,
                  alignItems: "center",
                  paddingBottom: 10,
                }}
              >
                <Text muted style={{ fontSize: 12, fontWeight: "500" }}>
                  {d}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {dates.map((date) => {
              const inMonth = date.slice(0, 7) === first.slice(0, 7);
              const onDate = visible.filter(
                (o) =>
                  dayKey(new Date(o.starts_at || o.due_at!), p.timezone) ===
                  date,
              );
              const exam = onDate.some((o) => o.event.kind === "exam");
              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={format(
                    parseISO(date),
                    "EEEE, MMMM d, yyyy",
                  )}
                  accessibilityState={{ selected: date === selected }}
                  onPress={() => {
                    setSelected(date);
                    if (!inMonth) setMonth(startOfMonth(parseISO(date)));
                  }}
                  style={{
                    width: `${100 / 7}%`,
                    minHeight: width < 400 ? 52 : 64,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        selected === date
                          ? t.accent
                          : today === date
                            ? t.elevated
                            : "transparent",
                      borderWidth: today === date && selected !== date ? 1 : 0,
                      borderColor: t.accent,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color:
                          selected === date
                            ? "#FFFFFF"
                            : inMonth
                              ? t.text
                              : blend(t.muted, t.background, 0.35),
                        fontWeight: today === date ? "700" : "400",
                      }}
                    >
                      {Number(date.slice(-2))}
                    </Text>
                  </View>
                  <View style={{ height: 5, flexDirection: "row", gap: 3 }}>
                    {onDate.slice(0, 3).map((o, i) => (
                      <View
                        key={`${o.key}:${i}`}
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor:
                            exam && p.highlight_exams ? t.danger : t.accent,
                        }}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 7,
              marginTop: 14,
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: t.danger,
              }}
            />
            <Text muted style={{ fontSize: 11 }}>
              Exam
            </Text>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: t.accent,
                marginLeft: 12,
              }}
            />
            <Text muted style={{ fontSize: 11 }}>
              Event or deadline
            </Text>
          </View>
        </View>
        <View style={{ width: wide ? 370 : "100%", gap: 22 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "500",
              textAlign: wide ? "left" : "center",
            }}
          >
            {format(parseISO(selected), "EEEE, MMMM d, yyyy")}
          </Text>
          {!selectedEvents.length ? (
            <EmptyState
              icon="calendar-blank-outline"
              title="A clear calendar"
              description="No visible events on this day. Add a plan or change the calendar filters."
            />
          ) : (
            (
              [
                "exam",
                "quiz",
                "assignment",
                "activity",
                "lecture",
                "tutorial",
                "seminar",
                "lab",
              ] as EventKind[]
            ).map((kind) => {
              const items = selectedEvents.filter((o) => o.event.kind === kind);
              return items.length ? (
                <View key={kind} style={{ gap: 8 }}>
                  <SectionTitle>{typeLabels[kind]}</SectionTitle>
                  {items.map((o) => (
                    <EventRow
                      key={o.key}
                      occurrence={o}
                      disabled={composing || detailEditing}
                      onOpen={
                        width >= 1100 ? (item) => setDetail(item) : undefined
                      }
                    />
                  ))}
                </View>
              ) : null;
            })
          )}
        </View>
      </View>
      {filters ? (
        <Sheet
          visible
          title="Show in Calendar"
          onClose={() => setFilters(false)}
        >
          <Text muted style={{ fontSize: 14 }}>
            Keep important dates in view. Your full class schedule always
            appears in Today.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {EVENT_KINDS.map((kind) => (
              <Chip
                key={kind}
                selected={p.calendar_types.includes(kind)}
                onPress={() => {
                  void perform(() =>
                    updatePreferences({
                      calendar_types: p.calendar_types.includes(kind)
                        ? p.calendar_types.filter((k) => k !== kind)
                        : [...p.calendar_types, kind],
                    }),
                  );
                }}
              >
                {typeLabels[kind]}
              </Chip>
            ))}
          </View>
          <Button onPress={() => setFilters(false)}>Done</Button>
        </Sheet>
      ) : null}
    </Screen>
  );
}
