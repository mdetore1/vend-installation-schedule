// Single-slot "undo my last action" toast — shared by every page that lets
// you reverse a delete/update (Dashboard, Project Tracker, Sales Queue).
// Auto-dismisses after a minute so a stale offer to undo something long
// since moved past doesn't just sit there.
import { useEffect, useRef, useState } from "react";

const AUTO_DISMISS_MS = 60_000;

export function useUndoToast() {
  const [undoAction, setUndoActionState] = useState(null); // { label, run }
  const timerRef = useRef(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function setUndoAction(action) {
    clearTimer();
    setUndoActionState(action);
    if (action) timerRef.current = setTimeout(() => setUndoActionState(null), AUTO_DISMISS_MS);
  }

  function dismiss() {
    clearTimer();
    setUndoActionState(null);
  }

  async function runUndo() {
    const action = undoAction;
    if (!action) return;
    dismiss();
    await action.run();
  }

  useEffect(() => clearTimer, []);

  return { undoAction, setUndoAction, runUndo, dismiss };
}
