"use client";

import { useTheme } from "@/lib/theme";

/**
 * Dark/light mode switch.
 *
 * Both states use a same-length label ("Mode Terang" / "Mode Gelap") so the
 * row width doesn't shift when the user flips the toggle. The thumb moves
 * via `transform: translateX` for GPU compositing, and the theme provider
 * disables CSS transitions during the actual dark-class swap so the colour
 * change across the page is instant rather than rippling through every
 * element's individual transition timing.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-ink/5 bg-prime-100 p-4 shadow-soft hover:border-accent/40"
    >
      <span className="font-display text-sm font-semibold text-ink">
        {isDark ? "Mode Gelap" : "Mode Terang"}
      </span>

      {/* Switch track + thumb.
          Track: 44 x 24. Thumb: 20 x 20, anchored at left:2 / top:2,
          translateX(0) when off, translateX(20px) when on — keeping a 2 px
          edge clearance in both states. */}
      <span
        className={`relative h-6 w-11 flex-shrink-0 rounded-full ${
          isDark ? "bg-accent" : "bg-prime-400"
        }`}
        aria-hidden
      >
        <span
          className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-150 ease-out"
          style={{
            transform: isDark ? "translateX(20px)" : "translateX(0)",
          }}
        />
      </span>
    </button>
  );
}
