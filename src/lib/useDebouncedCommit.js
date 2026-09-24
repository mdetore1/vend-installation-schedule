import { useEffect, useRef, useState } from "react";

const DEBOUNCE_COMMIT_MS = 500;

// Types instantly (local state, no network) and only calls onCommit after a
// pause or on blur — for any field bound to data that's expensive to write
// (a realtime refetch of the whole schedule on every keystroke, for
// example). Without this, an input bound straight to that live prop
// doesn't even show the next character until the write + refetch
// round-trip finishes, which reads as multi-second lag per letter.
// Returns plain input props ({value, onChange, onFocus, onBlur}) to spread
// onto whatever element needs them — a bare <input> with fully custom
// styling, or a TextInput via DebouncedTextInput.
export function useDebouncedCommit(value, onCommit) {
  const [local, setLocal] = useState(value ?? "");
  const timerRef = useRef(null);
  const focusedRef = useRef(false);

  // Only resyncs when the live value actually changes (not on every render,
  // and not just because focus toggled) — an effect, not a render-time
  // comparison, so a blur doesn't briefly snap the field back to the old
  // value before the just-saved one round-trips back in.
  useEffect(() => {
    if (!focusedRef.current) setLocal(value ?? "");
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function commit(next) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    onCommit(next);
  }

  return {
    value: local,
    onChange: (e) => {
      const next = e.target.value;
      setLocal(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => commit(next), DEBOUNCE_COMMIT_MS);
    },
    onFocus: () => {
      focusedRef.current = true;
    },
    onBlur: () => {
      focusedRef.current = false;
      commit(local);
    },
  };
}
