import { useEffect, useState } from "react";

// Persist form state to localStorage so a refresh never loses work.
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      const stored = JSON.parse(raw);
      // Merge saved data over current defaults so newly-added fields aren't undefined.
      if (initial && typeof initial === "object" && !Array.isArray(initial)) {
        return { ...initial, ...stored };
      }
      return stored;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / serialization errors */
    }
  }, [key, value]);

  return [value, setValue];
}

let _id = 0;
export const newId = () => `${Date.now()}_${_id++}`;
