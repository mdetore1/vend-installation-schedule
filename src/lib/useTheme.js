import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vend-theme";

// Light unless someone has explicitly switched — an OS set to dark mode
// shouldn't silently restyle the whole app for everyone on the team. The
// matching inline script in installs.html/index.html applies the saved
// choice before first paint so a reload doesn't flash light first.
function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readSaved);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore — per-viewer convenience only
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
}
