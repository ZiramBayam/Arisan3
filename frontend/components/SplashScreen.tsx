"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Logo } from "./Logo";

type Phase = "rise" | "spin" | "pause" | "highlight" | "zoom" | "done";

// --- Geometry ---------------------------------------------------------------
const LOGO_SIZE = 160; // px on screen
const SVG_VIEWBOX = 200;
const SVG_RADIUS = 70;
// A bigger base size means the GPU works with a larger source layer and a
// smaller scale factor at the end. Smoother on lower-spec devices than a
// tiny circle being scaled by 250x.
const REVEAL_BASE_DIAMETER = 800; // px — larger base = much smaller scale factor, GPU isn't asked to interpolate huge per-frame jumps

// --- Animation tuning -------------------------------------------------------
const SPIN_DEG = 30; // very slow, deliberate rotation in 500 ms
const RISE_MS = 200;
const SPIN_MS = 500;
const PAUSE_MS = 100;
// Give the dot's green->dashboard-colour fill transition (160 ms) room to
// land fully before the iris starts opening.
const HIGHLIGHT_HOLD_MS = 240;
// Vintage cartoon iris feel with an S-curve so the iris eases in, glides
// through the middle, then settles to a stop instead of snapping.
const ZOOM_MS = 800;
const FADE_OUT_MS = 200;

const EASE_SMOOTH = "cubic-bezier(0.4, 0, 0.2, 1)";
// Symmetric ease-in-out — the same curve used in classic hand-animated
// iris transitions where motion accelerates in and decelerates out evenly.
const EASE_IRIS = "cubic-bezier(0.45, 0, 0.55, 1)";

// Scale factor: starts at 0 (invisible), grows to 30 -> a 6000 px circle,
// enough to cover any 4k viewport diagonal even when the iris is anchored
// off-centre at the dot's screen position.
const REVEAL_SCALE = 10;

// The "top" satellite dot lives at SVG clock angle 340. After SPIN_DEG of
// CW rotation it lands at this clock angle — and that's where the iris
// originates on screen.
const TOP_END_CLOCK = (340 + SPIN_DEG) % 360;
const TOP_END_RAD = (TOP_END_CLOCK * Math.PI) / 180;
const DOT_SCREEN = {
  dx: ((SVG_RADIUS * Math.sin(TOP_END_RAD)) / SVG_VIEWBOX) * LOGO_SIZE,
  dy: ((-SVG_RADIUS * Math.cos(TOP_END_RAD)) / SVG_VIEWBOX) * LOGO_SIZE,
};

/**
 * Opening transition shown once per page load.
 *
 * The splash background uses `bg-ink` (theme-inverted) so:
 *   - light mode  : splash is dark, the dot fades to cream, cream iris
 *                   opens up to reveal the cream dashboard underneath.
 *   - dark mode   : splash is cream, the dot fades to ink-dark, dark iris
 *                   opens up to reveal the ink-dark dashboard underneath.
 *
 * The iris itself is a `transform: scale()` animation on a circular div
 * with `bg-prime` (theme-matched to the dashboard) — pure GPU compositing,
 * no per-frame rasterization. ease-in-out S-curve over 600 ms gives the
 * classic vintage cartoon iris feel.
 *
 *   0    rise      ({RISE_MS} ms keyframe, expo-out)
 *  200   spin      ({SPIN_MS} ms gentle {SPIN_DEG} deg rotation)
 *  700   pause     ({PAUSE_MS} ms still)
 *  800   highlight (top dot fades green -> dashboard colour, 160 ms)
 * 1040   zoom      ({ZOOM_MS} ms iris opens 0 -> {REVEAL_SCALE}x)
 * 1640   done      ({FADE_OUT_MS} ms opacity fade seals the seam)
 * 1840   unmount
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>("rise");
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const T_SPIN = RISE_MS;
    const T_PAUSE = T_SPIN + SPIN_MS;
    const T_HIGHLIGHT = T_PAUSE + PAUSE_MS;
    const T_ZOOM = T_HIGHLIGHT + HIGHLIGHT_HOLD_MS;
    const T_DONE = T_ZOOM + ZOOM_MS;
    const T_UNMOUNT = T_DONE + FADE_OUT_MS;

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("spin"), T_SPIN));
    timers.push(setTimeout(() => setPhase("pause"), T_PAUSE));
    timers.push(setTimeout(() => setPhase("highlight"), T_HIGHLIGHT));
    timers.push(setTimeout(() => setPhase("zoom"), T_ZOOM));
    timers.push(setTimeout(() => setPhase("done"), T_DONE));
    timers.push(setTimeout(() => setMounted(false), T_UNMOUNT));
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!mounted) return null;

  const showHighlight =
    phase === "highlight" || phase === "zoom" || phase === "done";
  const zoomActive = phase === "zoom" || phase === "done";

  const overlayStyle: CSSProperties = {
    opacity: phase === "done" ? 0 : 1,
    transition: `opacity ${FADE_OUT_MS}ms ${EASE_SMOOTH}`,
  };

  // Iris circle: a 200 x 200 div anchored at the dot's post-spin position,
  // scaling 0 -> 30x via GPU-only transform. Larger base + smaller scale
  // factor than before so the GPU works with a more reasonable layer size.
  const revealStyle: CSSProperties = {
    width: REVEAL_BASE_DIAMETER,
    height: REVEAL_BASE_DIAMETER,
    left: `calc(50% + ${DOT_SCREEN.dx}px - ${REVEAL_BASE_DIAMETER / 2}px)`,
    top: `calc(50% + ${DOT_SCREEN.dy}px - ${REVEAL_BASE_DIAMETER / 2}px)`,
    transform: zoomActive ? `scale(${REVEAL_SCALE})` : "scale(0)",
    transformOrigin: "center",
    transition: `transform ${ZOOM_MS}ms ${EASE_IRIS}`,
    willChange: "transform",
    backfaceVisibility: "hidden",
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-ink"
      style={overlayStyle}
      aria-hidden={phase === "done"}
    >
      {/* Logo (rise + spin), centered on the viewport */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={phase === "rise" ? "animate-splash-rise" : ""}
          style={{
            transform: phase === "rise" ? undefined : "translateY(0)",
            willChange: "transform",
          }}
        >
          <div
            style={{
              transform:
                phase === "rise" ? "rotate(0deg)" : `rotate(${SPIN_DEG}deg)`,
              transition: `transform ${SPIN_MS}ms ${EASE_SMOOTH}`,
              willChange: "transform",
            }}
          >
            <Logo
              size={LOGO_SIZE}
              highlightedDot={showHighlight ? "top" : null}
            />
          </div>
        </div>
      </div>

      {/* Iris reveal circle — `bg-prime` matches the dashboard background
          for the current theme, so when the iris is fully open the splash
          and the page underneath are the same colour and the seam is
          invisible. */}
      <div
        className="pointer-events-none absolute rounded-full bg-prime"
        style={revealStyle}
        aria-hidden
      />
    </div>
  );
}
