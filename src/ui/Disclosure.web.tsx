import { PropsWithChildren, useState } from "react";
import { useTheme } from "./theme";

export function Disclosure({
  open,
  children,
}: PropsWithChildren<{ open: boolean }>) {
  const { reduceMotion } = useTheme();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  return (
    <div
      aria-hidden={!open}
      inert={!open}
      style={{
        display: "grid",
        gridTemplateRows: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        transition: reduceMotion
          ? undefined
          : "grid-template-rows 170ms ease-out, opacity 140ms ease-out",
      }}
      onTransitionEnd={(event) => {
        if (
          !open &&
          event.target === event.currentTarget &&
          event.propertyName === "grid-template-rows"
        )
          setMounted(false);
      }}
    >
      <div style={{ minHeight: 0, overflow: "hidden" }}>
        {(open || (mounted && !reduceMotion)) && children}
      </div>
    </div>
  );
}
