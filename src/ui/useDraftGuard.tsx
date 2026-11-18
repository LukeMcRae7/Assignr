import { useState } from "react";
import { usePreventRemove } from "expo-router";
import { Button, Sheet, Text } from "./primitives";

export function useDraftGuard(
  dirty: boolean,
  busy: boolean,
  onClose: () => void,
) {
  const [leaving, setLeaving] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const disablePrevention = usePreventRemove(
    dirty && !leaving,
    ({ repeat }) => {
      if (!busy) setPending(() => repeat);
    },
  );
  function finish(action = onClose) {
    setLeaving(true);
    disablePrevention();
    action();
  }
  function requestClose() {
    if (busy) return;
    if (dirty) setPending(() => onClose);
    else finish();
  }
  const confirmation = pending ? (
    <Sheet visible title="Discard changes?" onClose={() => setPending(null)}>
      <Text muted>Your changes haven’t been saved.</Text>
      <Button variant="danger" onPress={() => finish(pending)}>
        Discard changes
      </Button>
      <Button variant="secondary" onPress={() => setPending(null)}>
        Keep editing
      </Button>
    </Sheet>
  ) : null;
  return { requestClose, finish, confirmation };
}
