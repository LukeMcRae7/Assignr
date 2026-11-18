import { Field } from "./primitives";

export interface DateTimeFieldProps {
  label: string;
  value: string;
  mode: "date" | "time";
  onChangeText(value: string): void;
  hint?: string;
  placeholder?: string;
}

export function DateTimeField({ mode, ...props }: DateTimeFieldProps) {
  return (
    <Field
      {...props}
      placeholder={
        props.placeholder || (mode === "date" ? "YYYY-MM-DD" : "HH:MM")
      }
      autoCapitalize="none"
    />
  );
}
