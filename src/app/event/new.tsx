import { router, useLocalSearchParams } from "expo-router";
import { EventEditor } from "../../features/events/EventEditor";
import { EVENT_KINDS, EventKind } from "../../domain/model";
export default function NewEventRoute() {
  const params = useLocalSearchParams<{
    kind?: string;
    courseId?: string;
    date?: string;
    parentId?: string;
    originalDate?: string;
  }>();
  return (
    <EventEditor
      {...params}
      kind={
        EVENT_KINDS.includes(params.kind as EventKind)
          ? (params.kind as EventKind)
          : "assignment"
      }
      onClose={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/");
      }}
    />
  );
}
