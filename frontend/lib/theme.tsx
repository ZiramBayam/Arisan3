"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

/**
 * Apply the theme to <html> via the `data-theme` attribute, with all CSS
 * transitions temporarily disabled. This prevents the page from rippling
 * through colour transitions (one per element) when the theme flips — the
 * swap happens in a single paint instead.
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

  root.setAttribute("data-theme", theme);

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

  // After mount, read DOM (set by the head-script before paint) and sync
  // React state to match. This effect ONLY reads — it never writes to the
  // DOM or localStorage. That way StrictMode's double-invocation can't
  // bounce the data-theme attribute mid-frame.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const dom = document.documentElement.getAttribute("data-theme");
    if (dom === "dark") setThemeState("dark");
    else if (dom === "light") setThemeState("light");
  }, []);

  // All DOM/localStorage mutations go through this one handler, called
  // explicitly by user actions (toggle button, programmatic setTheme).
  const changeTheme = useCallback((next: Theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    // Read the DOM (authoritative) instead of React state, which can lag
    // by one render right after mount.
    const current =
      typeof document !== "undefined"
        ? document.documentElement.getAttribute("data-theme")
        : "light";
    changeTheme(current === "dark" ? "light" : "dark");
  }, [changeTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
