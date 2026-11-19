import {
  CSSProperties,
  PropsWithChildren,
  RefObject,
  KeyboardEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Icon, Text } from "./primitives";
import { useTheme } from "./theme";
import { displayWallTime, isDate, isTime } from "../domain/dates";
import { useWorkspace } from "../providers/WorkspaceProvider";
import "./picker.css";

export interface DateTimeFieldProps {
  label: string;
  value: string;
  mode: "date" | "time";
  onChangeText(value: string): void;
  hint?: string;
  placeholder?: string;
  compact?: boolean;
  displayLabel?: string;
  color?: string;
  onClear?(): void;
}

const keyOf = (date: Date) => format(date, "yyyy-MM-dd");
function CalendarPicker({
  value,
  choose,
}: {
  value: string;
  choose(value: string): void;
}) {
  const [cursor, setCursor] = useState(() =>
    isDate(value) ? parseISO(value) : new Date(),
  );
  const [months, setMonths] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      grid.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
      pendingFocus.current = false;
    }
  }, [cursor, months]);
  const first = startOfWeek(startOfMonth(cursor));
  const today = keyOf(new Date());
  function navigate(e: KeyboardEvent<HTMLButtonElement>, from: Date) {
    const offsets: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 7,
      ArrowUp: -7,
      Home: -from.getDay(),
      End: 6 - from.getDay(),
    };
    const next =
      e.key in offsets
        ? addDays(from, offsets[e.key])
        : e.key === "PageUp" || e.key === "PageDown"
          ? addMonths(from, e.key === "PageUp" ? -1 : 1)
          : null;
    if (next) {
      e.preventDefault();
      pendingFocus.current = true;
      setCursor(next);
    }
  }
  const step = (n: number) => setCursor(addMonths(cursor, months ? n * 12 : n));
  return (
    <>
      <div className="picker-heading">
        <button
          aria-label={months ? "Previous year" : "Previous month"}
          onClick={() => step(-1)}
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <button
          aria-label="Choose month and year"
          onClick={() => setMonths(!months)}
        >
          {format(cursor, months ? "yyyy" : "MMMM yyyy")}{" "}
          <Icon name="chevron-down" size={16} />
        </button>
        <button
          aria-label={months ? "Next year" : "Next month"}
          onClick={() => step(1)}
        >
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
      {months ? (
        <div className="picker-months">
          {Array.from({ length: 12 }, (_, i) => {
            const month = new Date(cursor.getFullYear(), i, 1);
            return (
              <button
                key={i}
                aria-label={format(month, "MMMM yyyy")}
                aria-pressed={i === cursor.getMonth()}
                onClick={() => {
                  pendingFocus.current = true;
                  setCursor(month);
                  setMonths(false);
                }}
              >
                {format(month, "MMM")}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="picker-grid" ref={grid}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <span key={d}>{d}</span>
          ))}
          {Array.from({ length: 42 }, (_, i) => {
            const date = addDays(first, i),
              day = keyOf(date);
            return (
              <button
                key={day}
                aria-label={format(date, "EEEE, MMMM d, yyyy")}
                aria-pressed={day === value}
                aria-current={day === today ? "date" : undefined}
                tabIndex={day === keyOf(cursor) ? 0 : -1}
                data-muted={!isSameMonth(date, cursor)}
                onKeyDown={(e) => navigate(e, date)}
                onClick={() => choose(day)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      )}
      <button className="picker-today" onClick={() => choose(today)}>
        Today
      </button>
    </>
  );
}

function TimeColumn({
  label,
  values,
  selected,
  select,
}: {
  label: string;
  values: string[];
  selected: string;
  select(v: string): void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    list.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  return (
    <div className="picker-column">
      <span>{label}</span>
      <div ref={list} role="group" aria-label={label}>
        {values.map((v, i) => (
          <button
            key={v}
            tabIndex={v === selected ? 0 : -1}
            aria-pressed={v === selected}
            aria-label={label + " " + v}
            onClick={() => select(v)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
              e.preventDefault();
              const next =
                (i + (e.key === "ArrowUp" ? -1 : 1) + values.length) %
                values.length;
              select(values[next]);
              list.current?.querySelectorAll("button")[next]?.focus();
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
function TimePicker({
  value,
  hour24,
  choose,
}: {
  value: string;
  hour24: boolean;
  choose(value: string): void;
}) {
  const [time, setTime] = useState(isTime(value) ? value : "09:00");
  const [hour, minute] = time.split(":");
  const h = Number(hour),
    pm = h >= 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <>
      <div className="picker-heading">
        <strong>{displayWallTime(time, hour24)}</strong>
      </div>
      <div className="picker-time">
        <TimeColumn
          label="Hour"
          values={Array.from({ length: hour24 ? 24 : 12 }, (_, i) =>
            hour24 ? pad(i) : String(i + 1),
          )}
          selected={hour24 ? hour : String(h % 12 || 12)}
          select={(v) =>
            setTime(
              pad(hour24 ? Number(v) : (Number(v) % 12) + (pm ? 12 : 0)) +
                ":" +
                minute,
            )
          }
        />
        <TimeColumn
          label="Minute"
          values={Array.from({ length: 60 }, (_, i) => pad(i))}
          selected={minute}
          select={(v) => setTime(hour + ":" + v)}
        />
        {!hour24 && (
          <div className="picker-period">
            {["AM", "PM"].map((p, i) => (
              <button
                key={p}
                aria-pressed={Number(pm) === i}
                onClick={() => setTime(pad((h % 12) + i * 12) + ":" + minute)}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="picker-done" onClick={() => choose(time)}>
        Done
      </button>
    </>
  );
}

function PickerPopover({
  trigger,
  label,
  theme,
  onClose,
  children,
}: PropsWithChildren<{
  trigger: RefObject<HTMLButtonElement | null>;
  label: string;
  theme: CSSProperties;
  onClose(): void;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = panel.current;
    const layer = dialog.current;
    if (!el || !layer) return;
    layer.showModal();
    el.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus({
      preventScroll: true,
    });
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect || !el) return;
      const margin = 8,
        gap = 5;
      const maxTop = window.innerHeight - el.offsetHeight - margin;
      const top =
        rect.bottom + gap <= maxTop
          ? rect.bottom + gap
          : rect.top - el.offsetHeight - gap;
      el.style.top = Math.max(margin, Math.min(top, maxTop)) + "px";
      el.style.left =
        Math.max(
          margin,
          Math.min(rect.left, window.innerWidth - el.offsetWidth - margin),
        ) + "px";
    }
    place();
    const observer = new ResizeObserver(place);
    observer.observe(el);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      layer.close();
      window.removeEventListener("resize", place);
    };
  }, [trigger]);
  return (
    <dialog
      ref={dialog}
      role="dialog"
      aria-label={label}
      className="picker-backdrop"
      style={theme}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panel} className="picker-card">
        {children}
      </div>
    </dialog>
  );
}

export function DateTimeField({
  label,
  value,
  mode,
  onChangeText,
  compact,
  displayLabel,
  color,
  onClear,
}: DateTimeFieldProps) {
  const t = useTheme();
  const { preferences } = useWorkspace();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const theme = {
    "--pick-bg": t.background,
    "--pick-surface": t.surface,
    "--pick-hover": t.elevated,
    "--pick-border": t.border,
    "--pick-text": t.text,
    "--pick-muted": t.muted,
    "--pick-accent": t.accent,
  } as CSSProperties;
  const text =
    displayLabel ||
    (mode === "date" && isDate(value)
      ? format(parseISO(value), compact ? "MMM d" : "MMM d, yyyy")
      : mode === "time" && isTime(value)
        ? displayWallTime(value, preferences.hour24)
        : compact
          ? ""
          : "Select " + mode);
  function close() {
    setOpen(false);
    requestAnimationFrame(() =>
      trigger.current?.focus({ preventScroll: true }),
    );
  }
  function choose(v: string) {
    onChangeText(v);
    close();
  }
  return (
    <View testID="form-field" style={{ gap: 6, flexShrink: 0, minWidth: 0 }}>
      {!compact && (
        <Text muted style={{ fontSize: 12, fontWeight: "500" }}>
          {label}
        </Text>
      )}
      <button
        ref={trigger}
        type="button"
        className={"picker-trigger" + (compact ? " compact" : "")}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ ...theme, color: color || t.text }}
        onClick={() => setOpen(true)}
      >
        {text && <span>{text}</span>}
        <Icon
          size={16}
          color={color || t.muted}
          name={mode === "date" ? "calendar-blank-outline" : "clock-outline"}
        />
      </button>
      {open && (
        <PickerPopover
          trigger={trigger}
          label={label}
          theme={theme}
          onClose={close}
        >
          <div className="picker-label">
            {label}
            <button aria-label="Close picker" onClick={close}>
              <Icon name="close" size={17} />
            </button>
          </div>
          {mode === "date" ? (
            <CalendarPicker value={value} choose={choose} />
          ) : (
            <TimePicker
              value={value}
              hour24={preferences.hour24}
              choose={choose}
            />
          )}
          {onClear && value && (
            <button
              className="picker-today"
              onClick={() => {
                onClear();
                close();
              }}
            >
              Clear date
            </button>
          )}
        </PickerPopover>
      )}
    </View>
  );
}
