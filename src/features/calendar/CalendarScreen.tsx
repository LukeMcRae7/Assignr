import { useMemo, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import {
  addMonths,
  format,
  getDaysInMonth,
  parseISO,
  startOfMonth,
} from "date-fns";
import { router } from "expo-router";
import { addDateDays, dayKey, weekday } from "../../domain/dates";
import { EventKind, Occurrence, StudyEvent } from "../../domain/model";
import { calendarVisible, typeKey, usedTypes } from "../../domain/eventEditor";
import { calendarDays } from "../../domain/calendar";
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
import { EnterTransition } from "../../ui/EnterTransition";
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
  activity: "Events",
};
export function CalendarScreen() {
  const {
    events,
    courses,
    preferences: p,
    updatePreferences,
    perform,
  } = useWorkspace();
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const today = dayKey(new Date(), p.timezone);
  const [month, setMonth] = useState(startOfMonth(parseISO(today)));
  const [selected, setSelected] = useState(today);
  const [filters, setFilters] = useState(false);
  const [composing, setComposing] = useState(false);
  const [detail, setDetail] = useState<Occurrence | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const panelOpen = composing || !!detail;
  const desktop = width >= 1100;

  const types = useMemo(() => usedTypes(events), [events]);
  const eventColor = (e: StudyEvent) =>
    e.kind === "exam" && p.highlight_exams
      ? t.danger
      : courses.find((c) => c.id === e.course_id)?.color || t.accent;
  const first = format(month, "yyyy-MM-dd");
  const gridStart = addDateDays(first, -weekday(first));
  const days = Math.ceil((weekday(first) + getDaysInMonth(month)) / 7) * 7;
  const dates = Array.from({ length: days }, (_, i) =>
    addDateDays(gridStart, i),
  );
  const byDay = calendarDays(events, gridStart, days, p);
  const selectedEvents = byDay.get(selected) || [];
  function navigateMonth(direction: number) {
    const next = addMonths(month, direction);
    chooseDay(format(next, "yyyy-MM-dd"));
  }
  function chooseDay(day: string) {
    setSelected(day);
    setMonth(startOfMonth(parseISO(day)));
    if (!detailEditing) setDetail(null);
  }
  const agenda = (
    <View
      style={{
        width: "100%",
        padding: desktop ? 16 : 0,
        gap: 22,
      }}
    >
      {!desktop && (
        <Text
          style={{
            fontSize: 18,
            fontWeight: "500",
            textAlign: desktop ? "left" : "center",
          }}
        >
          {format(parseISO(selected), "EEEE, MMMM d, yyyy")}
        </Text>
      )}
      {!selectedEvents.length ? (
        <EmptyState
          icon="calendar-blank-outline"
          title="No events on this day"
        />
      ) : (
        [...types]
          .sort((a, b) => Number(b.kind === "exam") - Number(a.kind === "exam"))
          .map((type) => {
            const key = typeKey(type);
            const items = selectedEvents.filter(
              (o) => typeKey(o.event) === key,
            );
            return items.length ? (
              <View key={key} style={{ gap: 8 }}>
                <SectionTitle>
                  {type.custom_type || typeLabels[type.kind]}
                </SectionTitle>
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
  );
  return (
    <Screen
      title="Calendar"
      fluid={desktop}
      aside={
        desktop || panelOpen ? (
          <View
            style={{
              flex: 1,
              minHeight: 0,
              borderLeftWidth: desktop ? 1 : 0,
              borderColor: t.border,
              paddingLeft: desktop ? 12 : 0,
            }}
          >
            {desktop && (
              <View
                style={{
                  minHeight: 64,
                  paddingHorizontal: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text muted style={{ fontSize: 13 }}>
                    {format(parseISO(selected), "EEEE")}
                  </Text>
                  <Text
                    accessibilityRole="header"
                    style={{ fontSize: 22, fontWeight: "600" }}
                  >
                    {format(parseISO(selected), "MMMM d")}
                  </Text>
                </View>
                {!panelOpen && (
                  <Button
                    compact
                    icon="plus"
                    label="Add event"
                    onPress={() => setComposing(true)}
                  >
                    Add event
                  </Button>
                )}
              </View>
            )}
            <EnterTransition
              key={composing ? "compose" : detail?.key || "agenda"}
              style={{ flex: 1, minHeight: 0 }}
            >
              {composing ? (
                <EventEditor
                  context="general"
                  kind="activity"
                  date={selected}
                  onDateChange={chooseDay}
                  presentation="inline"
                  onClose={() => setComposing(false)}
                />
              ) : detail ? (
                <EventDetail
                  key={detail.key}
                  id={detail.event.id}
                  date={detail.original_date || undefined}
                  presentation="inline"
                  onEditingChange={setDetailEditing}
                  onClose={() => {
                    setDetail(null);
                    setDetailEditing(false);
                  }}
                />
              ) : desktop ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1 }}
                >
                  {agenda}
                </ScrollView>
              ) : null}
            </EnterTransition>
          </View>
        ) : undefined
      }
      actions={
        <>
          <IconButton
            icon="calendar-today"
            label="Go to today"
            onPress={() => {
              chooseDay(today);
            }}
          />
          <IconButton
            icon="filter-variant"
            label="Calendar visibility"
            disabled={!types.length}
            onPress={() => setFilters(true)}
          />
        </>
      }
      floating={
        !desktop && !panelOpen ? (
          <Fab
            onPress={() =>
              router.push({
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
          flexDirection: "column",
          gap: 36,
          alignItems: "flex-start",
        }}
      >
        <View
          style={{
            width: "100%",
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
              const onDate = byDay.get(date) || [];
              const previews =
                p.highlight_exams && onDate.some((o) => o.event.kind === "exam")
                  ? [...onDate].sort(
                      (a, b) =>
                        Number(b.event.kind === "exam") -
                        Number(a.event.kind === "exam"),
                    )
                  : onDate;
              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={format(
                    parseISO(date),
                    "EEEE, MMMM d, yyyy",
                  )}
                  accessibilityState={{ selected: date === selected }}
                  onPress={() => chooseDay(date)}
                  style={{
                    width: `${100 / 7}%`,
                    minHeight: desktop
                      ? Math.max(80, Math.min(160, (height - 215) / (days / 7)))
                      : width < 400
                        ? 46
                        : 54,
                    padding: desktop ? 5 : 0,
                    backgroundColor:
                      desktop && selected === date
                        ? blend(t.accent, t.background, 0.07)
                        : "transparent",
                    borderColor:
                      selected === date && desktop ? t.accent : t.border,
                    borderWidth: desktop ? 0.5 : 0,
                    alignItems: desktop ? "flex-start" : "center",
                    justifyContent: desktop ? "flex-start" : "center",
                    gap: 3,
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
                  {desktop ? (
                    <View style={{ alignSelf: "stretch", gap: 2 }}>
                      {previews.slice(0, 2).map(({ key, event }) => (
                        <Text
                          key={key}
                          numberOfLines={1}
                          style={{
                            fontSize: 11,
                            lineHeight: 16,
                            paddingHorizontal: 4,
                            borderLeftWidth: 2,
                            borderColor: eventColor(event),
                            backgroundColor: blend(
                              eventColor(event),
                              t.background,
                              0.12,
                            ),
                          }}
                        >
                          {event.kind === "lecture" && !event.custom_type
                            ? courses.find(
                                (course) => course.id === event.course_id,
                              )?.name || event.title
                            : event.title}
                        </Text>
                      ))}
                      {onDate.length > 2 ? (
                        <Text muted style={{ fontSize: 10 }}>
                          +{onDate.length - 2}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={{ height: 5, flexDirection: "row", gap: 3 }}>
                      {previews.slice(0, 3).map((o, i) => (
                        <View
                          key={`${o.key}:${i}`}
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: eventColor(o.event),
                          }}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        {!desktop && agenda}
      </View>
      {filters ? (
        <Sheet
          visible
          title="Show in Calendar"
          onClose={() => setFilters(false)}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {types.map((type) => {
              const key = typeKey(type);
              const selected = calendarVisible(type, p);
              return (
                <Chip
                  key={key}
                  selected={selected}
                  onPress={() => {
                    void perform(() =>
                      updatePreferences(
                        type.custom_type
                          ? {
                              custom_type_visibility: {
                                ...p.custom_type_visibility,
                                [key]: !selected,
                              },
                            }
                          : {
                              calendar_types: selected
                                ? p.calendar_types.filter(
                                    (k) => k !== type.kind,
                                  )
                                : [...p.calendar_types, type.kind],
                            },
                      ),
                    );
                  }}
                >
                  {type.custom_type || typeLabels[type.kind]}
                </Chip>
              );
            })}
            {!types.length ? (
              <Text muted>Add an event to see its filter here.</Text>
            ) : null}
          </View>
        </Sheet>
      ) : null}
    </Screen>
  );
}
