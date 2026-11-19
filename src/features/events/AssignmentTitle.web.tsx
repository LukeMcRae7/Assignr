import { useLayoutEffect, useRef } from "react";
import { useTheme } from "../../ui/theme";

export function AssignmentTitle({
  title,
  completed,
}: {
  title: string;
  completed: boolean;
}) {
  const t = useTheme();
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      let size = 16;
      element.style.fontSize = size + "px";
      while (size > 13 && element.scrollWidth > element.clientWidth) {
        element.style.fontSize = --size + "px";
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [title]);
  return (
    <span
      ref={ref}
      title={title}
      style={{
        display: "block",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        fontFamily: "system-ui, sans-serif",
        fontWeight: 500,
        lineHeight: "23px",
        color: completed ? t.muted : t.text,
        textDecoration: completed ? "line-through" : undefined,
      }}
    >
      {title}
    </span>
  );
}
