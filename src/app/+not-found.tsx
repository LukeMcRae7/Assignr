import { router } from "expo-router";
import { Button, EmptyState, Screen } from "../ui/primitives";
export default function NotFound() {
  return (
    <Screen title="Assignr">
      <EmptyState
        title="This page wandered off"
        description="Let’s get you back to your student space."
        action={
          <Button onPress={() => router.replace("/")}>Back to ToDo</Button>
        }
      />
    </Screen>
  );
}
