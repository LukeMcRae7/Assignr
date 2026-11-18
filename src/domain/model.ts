export const EVENT_KINDS = [
  "assignment",
  "exam",
  "quiz",
  "lecture",
  "tutorial",
  "seminar",
  "lab",
  "activity",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export type ClassKind = "lecture" | "tutorial" | "seminar" | "lab";
export const CLASS_KINDS: EventKind[] = [
  "lecture",
  "tutorial",
  "seminar",
  "lab",
];
export type Priority = "low" | "medium" | "high";
export type ThemeMode = "system" | "light" | "dark";

export interface BaseRecord {
  id: string;
  user_id: string;
  version: number;
  deleted_at: string | null;
}

export interface Semester extends BaseRecord {
  name: string;
  start_date: string;
  end_date: string;
  timezone: string;
}

export interface Course extends BaseRecord {
  semester_id: string | null;
  name: string;
  code: string;
  professor: string;
  website: string;
  color: string;
  icon: string;
  position: number;
}

export interface WeeklyRule {
  days: number[];
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  target_date?: string | null;
  target_at?: string | null;
}

export interface StudyEvent extends BaseRecord {
  course_id: string | null;
  title: string;
  kind: EventKind;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  location: string;
  notes: string;
  priority: Priority | null;
  completed: boolean;
  subtasks: Subtask[];
  recurrence: WeeklyRule | null;
  parent_event_id: string | null;
  occurrence_date: string | null;
  cancelled: boolean;
}

export interface Preferences extends BaseRecord {
  theme: ThemeMode;
  accent: string;
  calendar_types: EventKind[];
  highlight_exams: boolean;
  hour24: boolean;
  default_due_time: string;
  timezone: string;
  group_assignments: boolean;
}

export interface Occurrence {
  key: string;
  event: StudyEvent;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  original_date: string | null;
}

export interface Snapshot {
  semesters: Semester[];
  courses: Course[];
  events: StudyEvent[];
  preferences: Preferences[];
}
export type Table = keyof Snapshot;
export type Entity = Semester | Course | StudyEvent | Preferences;
export interface Mutation {
  id: string;
  table: Table;
  record: Entity;
  expected_version: number;
}

export function defaultPreferences(userId: string): Preferences {
  return {
    id: userId,
    user_id: userId,
    version: 0,
    deleted_at: null,
    theme: "system",
    accent: "#2798EE",
    calendar_types: ["assignment", "exam", "quiz", "activity"],
    highlight_exams: true,
    hour24: false,
    default_due_time: "23:59",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    group_assignments: true,
  };
}

export const COURSE_COLORS = [
  "#A844BF",
  "#485BC4",
  "#36A85C",
  "#D05050",
  "#D79335",
  "#269C9C",
  "#B86593",
  "#79828E",
];
export const COURSE_ICONS = [
  "laptop",
  "server",
  "chart-line",
  "chart-bell-curve",
  "book-open-variant",
  "flask-outline",
  "palette-outline",
  "earth",
  "calculator-variant-outline",
  "music",
  "dna",
  "school-outline",
];
