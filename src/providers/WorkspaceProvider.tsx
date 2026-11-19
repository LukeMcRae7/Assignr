import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import {
  Course,
  Semester,
  defaultPreferences,
  Entity,
  Occurrence,
  Preferences,
  StudyEvent,
  Table,
} from "../domain/model";
import { validateCourse, validateEvent } from "../domain/validation";
import {
  dayKey,
  displayTime,
  isDate,
  weekday,
  zonedISO,
} from "../domain/dates";
import { StudyStore } from "../data/store";
import { createRemote, supabase } from "../data/supabase";
import { useAuth } from "./AuthProvider";
import { useDeviceTimezone } from "../ui/useDeviceTimezone";
import {
  defaultSemester,
  resolveSemesterEvents,
  validateSemester,
} from "../domain/semesters";

export const newId = () => Crypto.randomUUID();
function useCreateWorkspace(userId: string) {
  const timezone = useDeviceTimezone();
  const [selectedSemesterId, selectSemester] = useState<string | null>(null);
  const [store] = useState(
    () =>
      new StudyStore(
        userId,
        AsyncStorage,
        newId,
        userId === "local" ? undefined : createRemote(userId),
      ),
  );
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    void store.initialize();
    const net = NetInfo.addEventListener((s) =>
      store.setOnline(
        s.isConnected !== false && s.isInternetReachable !== false,
      ),
    );
    const app = AppState.addEventListener("change", (s) => {
      if (s === "active") void store.sync();
    });
    const interval = setInterval(() => {
      void store.sync();
    }, 60000);
    const channel =
      userId !== "local"
        ? supabase!
            .channel(`workspace:${userId}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", filter: `user_id=eq.${userId}` },
              () => {
                void store.sync();
              },
            )
            .subscribe()
        : null;
    return () => {
      store.dispose();
      net();
      app.remove();
      clearInterval(interval);
      if (channel) void supabase!.removeChannel(channel);
    };
  }, [store, userId]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  const preferences = {
    ...(state.snapshot.preferences[0] || defaultPreferences(userId)),
    timezone,
  };
  const semesters = useMemo(
    () =>
      state.snapshot.semesters
        .filter((s) => !s.deleted_at)
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [state.snapshot.semesters],
  );
  const selectedSemester =
    semesters.find((s) => s.id === selectedSemesterId) ||
    defaultSemester(semesters);
  const courses = useMemo(
    () =>
      state.snapshot.courses
        .filter((c) => !c.deleted_at)
        .sort(
          (a, b) => a.position - b.position || a.name.localeCompare(b.name),
        ),
    [state.snapshot.courses],
  );
  const events = useMemo(
    () =>
      resolveSemesterEvents(
        state.snapshot.events.filter((e) => !e.deleted_at),
        courses,
        semesters,
      ),
    [state.snapshot.events, courses, semesters],
  );
  const commit = (changes: { table: Table; record: Entity }[]) =>
    store.commit(changes);
  const base = () => ({
    id: newId(),
    user_id: userId,
    version: 0,
    deleted_at: null,
  });
  async function saveCourse(course: Course) {
    const error = validateCourse(course);
    if (error) throw new Error(error);
    if (!semesters.some((s) => s.id === course.semester_id))
      throw new Error("Choose a semester for this course.");
    await commit([
      { table: "courses", record: { ...course, name: course.name.trim() } },
    ]);
  }
  async function saveSemester(semester: Semester) {
    const error = validateSemester(semester);
    if (error) throw new Error(error);
    const existing = semesters.find((s) => s.id === semester.id);
    if (existing && existing.timezone !== semester.timezone)
      throw new Error("A semester keeps the timezone it was created in.");
    await commit([
      {
        table: "semesters",
        record: { ...semester, name: semester.name.trim() },
      },
    ]);
  }
  async function deleteSemester(semester: Semester) {
    if (courses.some((c) => c.semester_id === semester.id))
      throw new Error("Move or delete this semester’s courses first.");
    await commit([
      {
        table: "semesters",
        record: { ...semester, deleted_at: new Date().toISOString() },
      },
    ]);
  }
  async function saveEvent(event: StudyEvent) {
    event = resolveSemesterEvents([event], courses, semesters)[0];
    const error = validateEvent(event);
    if (error && !event.cancelled) throw new Error(error);
    if (event.parent_event_id) {
      const parent = events.find((e) => e.id === event.parent_event_id);
      const rule = parent?.recurrence;
      const existing = events.find((e) => e.id === event.id);
      const unchangedDate =
        existing?.parent_event_id === event.parent_event_id &&
        existing?.occurrence_date === event.occurrence_date;
      if (
        !rule ||
        !event.occurrence_date ||
        (!unchangedDate &&
          (event.occurrence_date < rule.start_date ||
            event.occurrence_date > rule.end_date ||
            !rule.days.includes(weekday(event.occurrence_date))))
      )
        throw new Error("The original class does not meet on that date.");
      if (parent.course_id !== event.course_id)
        throw new Error(
          "The replacement must belong to the same course as its class.",
        );
      const duplicate = events.find(
        (e) =>
          e.id !== event.id &&
          e.parent_event_id === event.parent_event_id &&
          e.occurrence_date === event.occurrence_date,
      );
      if (duplicate)
        throw new Error(
          "This class date already has a replacement. Edit or remove that replacement first.",
        );
    }
    await commit([
      { table: "events", record: { ...event, title: event.title.trim() } },
    ]);
  }
  async function deleteCourse(course: Course) {
    const deleted_at = new Date().toISOString();
    await commit([
      ...events
        .filter((e) => e.course_id === course.id)
        .map((record) => ({
          table: "events" as const,
          record: { ...record, deleted_at },
        })),
      { table: "courses", record: { ...course, deleted_at } },
    ]);
  }
  async function deleteEvent(event: StudyEvent) {
    const deleted_at = new Date().toISOString();
    await commit(
      [event, ...events.filter((e) => e.parent_event_id === event.id)].map(
        (record) => ({ table: "events", record: { ...record, deleted_at } }),
      ),
    );
  }
  async function skipOccurrence(occurrence: Occurrence) {
    await saveEvent({
      ...occurrence.event,
      ...base(),
      recurrence: null,
      parent_event_id: occurrence.event.id,
      occurrence_date: occurrence.original_date,
      starts_at: occurrence.starts_at,
      ends_at: occurrence.ends_at,
      cancelled: true,
    });
  }
  async function updatePreferences(patch: Partial<Preferences>) {
    await store.commit((snapshot) => [
      {
        table: "preferences",
        record: {
          ...(snapshot.preferences[0] || defaultPreferences(userId)),
          ...patch,
        },
      },
    ]);
  }
  async function changeDueDate(id: string, date: string) {
    if (!isDate(date)) throw new Error("Choose a valid due date.");
    await store.commit((snapshot) => {
      const event = snapshot.events.find((e) => e.id === id && !e.deleted_at);
      if (!event?.due_at || dayKey(new Date(event.due_at), timezone) === date)
        return [];
      const due_at = zonedISO(
        date,
        displayTime(event.due_at, timezone, true),
        timezone,
      );
      return [{ table: "events", record: { ...event, due_at } }];
    });
  }
  async function toggleAssignment(id: string) {
    await store.commit((snapshot) => {
      const event = snapshot.events.find((e) => e.id === id && !e.deleted_at);
      if (!event) return [];
      return [
        { table: "events", record: { ...event, completed: !event.completed } },
      ];
    });
  }
  async function toggleSubtask(id: string, subtaskId: string) {
    await store.commit((snapshot) => {
      const event = snapshot.events.find((e) => e.id === id && !e.deleted_at);
      if (!event) return [];
      return [
        {
          table: "events",
          record: {
            ...event,
            subtasks: event.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, completed: !s.completed } : s,
            ),
          },
        },
      ];
    });
  }
  async function perform(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Could not save your change. Please try again.",
      );
    }
  }
  return {
    ...state,
    userId,
    store,
    courses,
    semesters,
    selectedSemester,
    selectSemester,
    events,
    preferences,
    base,
    saveCourse,
    saveSemester,
    deleteSemester,
    saveEvent,
    deleteCourse,
    deleteEvent,
    skipOccurrence,
    updatePreferences,
    changeDueDate,
    toggleAssignment,
    toggleSubtask,
    perform,
    notice,
    setNotice,
    commit,
  };
}
const WorkspaceContext = createContext<ReturnType<typeof useCreateWorkspace>>(
  null!,
);
function AccountWorkspace({
  children,
  userId,
}: PropsWithChildren<{ userId: string }>) {
  const workspace = useCreateWorkspace(userId);
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id || "local";
  return (
    <AccountWorkspace key={userId} userId={userId}>
      {children}
    </AccountWorkspace>
  );
}
export const useWorkspace = () => useContext(WorkspaceContext);
