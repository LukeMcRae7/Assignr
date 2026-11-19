import { Text } from "../../ui/primitives";
import { useTheme } from "../../ui/theme";

export function AssignmentTitle({
  title,
  completed,
}: {
  title: string;
  completed: boolean;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      ellipsizeMode="tail"
      style={{
        fontWeight: "500",
        textDecorationLine: completed ? "line-through" : "none",
        color: completed ? t.muted : t.text,
      }}
    >
      {title}
    </Text>
  );
}
