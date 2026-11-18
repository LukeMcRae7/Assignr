import { useLocalSearchParams } from "expo-router";
import { EventDetail } from "../../features/events/EventDetail";
export default function EventRoute() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  return <EventDetail id={id} date={date} />;
}
