import { useLocalSearchParams } from "expo-router";
import { CourseDetailScreen } from "../../../features/courses/CourseDetailScreen";
export default function CourseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseDetailScreen id={id} />;
}
