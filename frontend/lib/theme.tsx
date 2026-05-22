"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "arisan3:theme";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Apply the dark class to <html> with all CSS transitions temporarily
 * disabled. This prevents the entire page from rippling through colour
 * transitions (one per element) when the theme flips — the swap happens
 * in a single paint instead.
 *
 * The toggle thumb has its own transform-based animation that re-engages
 * the moment the disabler is removed, so the visual response remains
 * snappy without the choppy cascade.
 */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const disabler = document.createElement("style");
  disabler.setAttribute("data-arisan3-theme-disabler", "");
  disabler.textContent = `
    *, *::before, *::after {
      transition-property: none !important;
      animation-duration: 0s !important;
    }
  `;
  document.head.appendChild(disabler);

  root.classList.toggle("dark", theme === "dark");

  // Re-enable transitions after the browser commits the paint. Two RAFs
  // guarantee the new colours have hit the screen before transitions
  // come back online, so the next hover/click can animate smoothly.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      disabler.remove();
    });
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  // Track whether we've hydrated, so the *very first* application of the
  // stored theme doesn't try to disable transitions before anything has
  // mounted (which would be wasted work).
  const hydrated = useRef(false);

  useEffect(() => {
    const initial = readInitialTheme();
    setThemeState(initial);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", initial === "dark");
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    applyTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(
    () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
    [],
  );

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
