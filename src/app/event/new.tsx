import { router, useLocalSearchParams } from "expo-router";
import { EventEditor } from "../../features/events/EventEditor";
import { EVENT_KINDS, EventKind } from "../../domain/model";
import { EventContext } from "../../domain/eventEditor";
export default function NewEventRoute() {
  const params = useLocalSearchParams<{
    kind?: string;
    courseId?: string;
    semesterId?: string;
    date?: string;
    parentId?: string;
    originalDate?: string;
    context?: string;
  }>();
  return (
    <EventEditor
      {...params}
      presentation="route"
      context={
        ["assignments", "assessments", "classes", "general"].includes(
          params.context || "",
        )
          ? (params.context as EventContext)
          : undefined
      }
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
