import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { dayKey, displayTime } from "../../domain/dates";
import { buildTimeline, occurrencesOnDate } from "../../domain/schedule";
import { useWorkspace } from "../../providers/WorkspaceProvider";
import {
  EmptyState,
  Fab,
  Icon,
  Screen,
  SectionTitle,
  Text,
} from "../../ui/primitives";
import { useTheme } from "../../ui/theme";
import { AssignmentRow, EventRow } from "../events/EventRows";

export function TodayScreen() {
  const { events, preferences: p } = useWorkspace();
  const t = useTheme();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);
  const today = dayKey(now, p.timezone);
  const occurrences = occurrencesOnDate(events, today, p.timezone);
  const timeline = buildTimeline(occurrences);
  const due = occurrences
    .filter((o) => o.event.kind === "assignment" && !o.event.completed)
    .map((o) => o.event);
  const otherDue = occurrences.filter(
    (o) => o.due_at && o.event.kind !== "assignment" && !o.event.completed,
  );
  return (
    <Screen
      title="Today"
      subtitle={new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: p.timezone,
      }).format(now)}
      floating={
        <Fab
          onPress={() =>
            router.push({
              pathname: "/event/new",
              params: { kind: "activity", date: today },
            })
          }
        />
      }
    >
      <View style={{ gap: 20 }}>
        <SectionTitle>Schedule</SectionTitle>
        {!timeline.length ? (
          <EmptyState
            icon="weather-partly-cloudy"
            title="The day is yours"
            description="No classes or timed plans today. Take a moment for yourself, or plan something new."
          />
        ) : (
          <View style={{ gap: 8 }}>
            {timeline.map((row, i) =>
              row.type === "event" ? (
                <EventRow
                  key={row.occurrence.key}
                  occurrence={row.occurrence}
                />
              ) : (
                <View
                  key={`break:${i}`}
                  style={{
                    backgroundColor: t.surface,
                    borderRadius: 12,
                    padding: 16,
                    marginVertical: 7,
                    flexDirection: "row",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <Icon name="coffee-outline" size={20} />
                  <Text
                    muted
                    style={{ fontSize: 14, fontStyle: "italic", flexShrink: 1 }}
                  >
                    {row.minutes >= 60
                      ? `${Math.floor(row.minutes / 60)} hour${row.minutes >= 120 ? "s" : ""}${row.minutes % 60 ? ` ${row.minutes % 60} min` : ""}`
                      : `${row.minutes} min`}{" "}
                    break{" "}
                    <Text muted style={{ fontSize: 12 }}>
                      ({displayTime(row.starts_at, p.timezone, p.hour24)} –{" "}
                      {displayTime(row.ends_at, p.timezone, p.hour24)})
                    </Text>
                  </Text>
                </View>
              ),
            )}
          </View>
        )}
      </View>
      {due.length ? (
        <View
          style={{
            gap: 10,
            borderTopWidth: 1,
            borderColor: t.border,
            paddingTop: 24,
          }}
        >
          <SectionTitle
            right={
              <Text muted style={{ fontSize: 13 }}>
                {due.length} remaining
              </Text>
            }
          >
            Due today
          </SectionTitle>
          {due.map((e) => (
            <AssignmentRow key={e.id} event={e} showCourse />
          ))}
        </View>
      ) : null}
      {otherDue.length ? (
        <View style={{ gap: 10 }}>
          <SectionTitle>Other deadlines</SectionTitle>
          {otherDue.map((o) => (
            <EventRow key={o.key} occurrence={o} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
