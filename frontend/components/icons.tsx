type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

function svg({
  size = 16,
  className,
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const CheckIcon = (p: IconProps) =>
  svg({ ...p, strokeWidth: p.strokeWidth ?? 2.5, children: <path d="M5 12l5 5L20 7" /> });

export const CloseIcon = (p: IconProps) =>
  svg({ ...p, children: <path d="M6 6l12 12M18 6L6 18" /> });

export const PencilIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <>
        <path d="M4 20h4l10-10-4-4L4 16v4z" />
        <path d="M14 6l4 4" />
      </>
    ),
  });

export const SunIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </>
    ),
  });

export const MoonIcon = (p: IconProps) =>
  svg({
    ...p,
    children: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
  });

export const ExternalIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <>
        <path d="M14 4h6v6" />
        <path d="M20 4l-9 9" />
        <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      </>
    ),
  });

export const BackIcon = (p: IconProps) =>
  svg({
    ...p,
    children: <path d="M15 6l-6 6 6 6" />,
  });

export const PlusIcon = (p: IconProps) =>
  svg({ ...p, children: <path d="M12 5v14M5 12h14" /> });

export const SparkleIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        <path d="M7 7l2.5 2.5M14.5 14.5L17 17M7 17l2.5-2.5M14.5 9.5L17 7" />
      </>
    ),
  });

export const StarIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 16.8 6.6 19.6l1-6L3.3 9.4l6-.9L12 3z" />
    ),
  });

export const PlayIcon = (p: IconProps) =>
  svg({ ...p, children: <path d="M8 5l11 7-11 7V5z" /> });

export const DownloadIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <>
        <path d="M12 4v12" />
        <path d="M7 11l5 5 5-5" />
        <path d="M5 20h14" />
      </>
    ),
  });

export const UploadIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <>
        <path d="M12 20V8" />
        <path d="M7 13l5-5 5 5" />
        <path d="M5 4h14" />
      </>
    ),
  });

export const RandomIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <>
        <path d="M20 4v6h-6" />
        <path d="M4 20v-6h6" />
        <path d="M20 10a8 8 0 0 0-14-3" />
        <path d="M4 14a8 8 0 0 0 14 3" />
      </>
    ),
  });

export const UserPlusIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M3 21c0-3 3-6 6-6s6 3 6 6" />
        <path d="M18 8v6M21 11h-6" />
      </>
    ),
  });

export const UserIcon = (p: IconProps) =>
  svg({
    ...p,
    children: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
      </>
    ),
  });
