type LogoProps = {
  size?: number;
  className?: string;
  /** Which satellite dot to recolor during the splash sequence. */
  highlightedDot?: "top" | "right" | "left" | null;
  /** Color override (defaults to accent green). */
  color?: string;
  /**
   * Color the highlighted dot fades to. Defaults to `rgb(var(--c-prime))`
   * so the dot picks up the current dashboard background colour — cream in
   * light mode, ink-dark in dark mode. That way the dot always matches the
   * iris-reveal layer that fans out from it and the dashboard underneath.
   */
  highlightColor?: string;
};

/**
 * Arisan3 logo. Three short arcs around a center dot, with three satellite
 * dots floating in the gaps between arcs. The arc/gap ratio (80 deg arcs,
 * 40 deg gaps) leaves clean visual breathing room between each rounded arc
 * cap and the neighbouring dot, so the silhouette reads as discrete pieces
 * rather than a continuous broken circle.
 */
export function Logo({
  size = 48,
  className,
  highlightedDot = null,
  color = "#1DB954",
  highlightColor = "rgb(var(--c-prime))",
}: LogoProps) {
  const dotFill = (which: NonNullable<LogoProps["highlightedDot"]>) =>
    highlightedDot === which ? highlightColor : color;
  // Transition the fill property smoothly so the "highlight" phase fades in
  // rather than snapping to the dashboard colour.
  const dotStyle = {
    transition: "fill 160ms cubic-bezier(0.4, 0, 0.2, 1)",
  } as const;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-label="Arisan3"
    >
      <g stroke={color} strokeWidth={22} strokeLinecap="round">
        {/* Arc A: clock 0 -> 80 (top -> upper-right) */}
        <path d="M 100 30 A 70 70 0 0 1 168.94 87.84" />
        {/* Arc B: clock 120 -> 200 (lower-right -> lower-left) */}
        <path d="M 160.62 135 A 70 70 0 0 1 76.06 165.78" />
        {/* Arc C: clock 240 -> 320 (lower-left -> upper-left) */}
        <path d="M 39.38 135 A 70 70 0 0 1 55 46.38" />
      </g>

      {/* Satellite dot near the top (clock 340) */}
      <circle
        cx={76.06}
        cy={34.22}
        r={9}
        style={{ ...dotStyle, fill: dotFill("top") }}
      />
      {/* Satellite dot on the right side (clock 100) */}
      <circle
        cx={168.94}
        cy={112.16}
        r={9}
        style={{ ...dotStyle, fill: dotFill("right") }}
      />
      {/* Satellite dot on the lower-left (clock 220) */}
      <circle
        cx={55}
        cy={153.62}
        r={9}
        style={{ ...dotStyle, fill: dotFill("left") }}
      />

      {/* Center dot */}
      <circle cx={100} cy={100} r={13} fill={color} />
    </svg>
  );
}
