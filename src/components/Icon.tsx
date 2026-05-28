import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps) {
  const { size = 18, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const IconLock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const IconUnlock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 7.5-2" />
  </svg>
);
export const IconEye = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconEyeOff = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4" />
    <path d="M6.2 6.2C3.2 8 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.8" />
    <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
  </svg>
);
export const IconCopy = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <rect x="4" y="4" width="11" height="11" rx="2" />
  </svg>
);
export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconEdit = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
  </svg>
);
export const IconTrash = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);
export const IconSearch = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
export const IconExternal = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3h7v7" />
    <path d="M10 14 21 3" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </svg>
);
export const IconDownload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);
export const IconUpload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21V9" />
    <path d="m7 14 5-5 5 5" />
    <path d="M5 3h14" />
  </svg>
);
export const IconRefresh = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);
export const IconShield = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);
export const IconKey = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="15" r="4" />
    <path d="m10.8 12.2 9.2-9.2" />
    <path d="m18 5 3 3" />
    <path d="m15 8 3 3" />
  </svg>
);
export const IconLogout = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
export const IconFilter = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 5h18l-7 9v6l-4-2v-4Z" />
  </svg>
);
export const IconX = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const IconSun = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);
export const IconMoon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);
export const IconCloud = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M17.5 19a4.5 4.5 0 0 0 0-9c-.27 0-.54.03-.8.08A6 6 0 0 0 5 12a5 5 0 0 0 5 7h7.5Z" />
  </svg>
);
export const IconCloudOff = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 3l18 18" />
    <path d="M17.5 19a4.5 4.5 0 0 0 3.2-7.7" />
    <path d="M16.7 10.1A6 6 0 0 0 5 12a5 5 0 0 0 5 7h6" />
  </svg>
);
export const IconUser = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const IconNote = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h6" />
  </svg>
);
export const IconGlobe = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18" />
    <path d="M12 3a14 14 0 0 0 0 18" />
  </svg>
);
export const IconLink = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </svg>
);
export const IconStar = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2l3 7 7 .5-5.4 4.8L18 22l-6-3.6L6 22l1.4-7.7L2 9.5 9 9z" />
  </svg>
);
export const IconStarFilled = (p: IconProps) => (
  <svg
    width={p.size ?? 20}
    height={p.size ?? 20}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={p.className}
    aria-hidden
  >
    <path d="M12 2l3 7 7 .5-5.4 4.8L18 22l-6-3.6L6 22l1.4-7.7L2 9.5 9 9z" />
  </svg>
);
export const IconSpinner = (p: IconProps) => (
  <svg
    width={p.size ?? 20}
    height={p.size ?? 20}
    viewBox="0 0 24 24"
    fill="none"
    className={`animate-spin ${p.className ?? ""}`}
    aria-hidden
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
export const IconCheckCircle = (p: IconProps) => (
  <svg
    width={p.size ?? 20}
    height={p.size ?? 20}
    viewBox="0 0 24 24"
    fill="none"
    className={p.className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 12.5l2.5 2.5L16 9.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const IconAlertCircle = (p: IconProps) => (
  <svg
    width={p.size ?? 20}
    height={p.size ?? 20}
    viewBox="0 0 24 24"
    fill="none"
    className={p.className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r="1" fill="currentColor" />
  </svg>
);
export const IconBold = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4h7a4 4 0 0 1 0 8H7z" />
    <path d="M7 12h8a4 4 0 0 1 0 8H7z" />
  </svg>
);
export const IconItalic = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 4h-9" />
    <path d="M14 20H5" />
    <path d="M15 4 9 20" />
  </svg>
);
export const IconStrikethrough = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12h16" />
    <path d="M16 6a4 4 0 0 0-4-2c-2.8 0-5 1.6-5 4 0 1.5 1 2.6 2.5 3.3" />
    <path d="M8 18a4 4 0 0 0 4 2c2.8 0 5-1.6 5-4 0-1.2-.6-2.2-1.8-3" />
  </svg>
);
export const IconCodeInline = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m8 8-5 4 5 4" />
    <path d="m16 8 5 4-5 4" />
    <path d="m14 4-4 16" />
  </svg>
);
export const IconListBullet = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 6h12" />
    <path d="M9 12h12" />
    <path d="M9 18h12" />
    <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
export const IconListOrdered = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 6h11" />
    <path d="M10 12h11" />
    <path d="M10 18h11" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 15c0-1-2-1-2 0 0 .8 2 1 2 2 0 1.2-2 1.2-2 0" />
  </svg>
);
export const IconListCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 6h11" />
    <path d="M10 12h11" />
    <path d="M10 18h11" />
    <path d="m3 6 1.5 1.5L7 5" />
    <path d="m3 12 1.5 1.5L7 11" />
    <path d="m3 18 1.5 1.5L7 17" />
  </svg>
);
export const IconQuote = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 7h4v4H7a2 2 0 0 0-2 2v1h2a4 4 0 0 0 4-4V7Z" />
    <path d="M15 7h4v4h-4a2 2 0 0 0-2 2v1h2a4 4 0 0 0 4-4V7Z" />
  </svg>
);
export const IconCodeBlock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="m9 9-3 3 3 3" />
    <path d="m15 9 3 3-3 3" />
  </svg>
);
export const IconWrap = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 6h18" />
    <path d="M3 12h15a3 3 0 0 1 0 6h-4" />
    <path d="m16 15-2 3 2 3" />
    <path d="M3 18h7" />
  </svg>
);
export const IconMinus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);
export const IconUnlink = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 14a5 5 0 0 0 7 0l1.5-1.5" />
    <path d="M14 10a5 5 0 0 0-7 0L5.5 11.5" />
    <path d="m3 3 18 18" />
  </svg>
);
export const IconTable = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M3 16h18" />
    <path d="M9 4v16" />
    <path d="M15 4v16" />
  </svg>
);
export const IconUndo = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </svg>
);
export const IconRedo = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H10a6 6 0 0 0 0 12h3" />
  </svg>
);
export const IconChevronDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconType = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7V5h16v2" />
    <path d="M9 20h6" />
    <path d="M12 5v15" />
  </svg>
);
export const IconHeading1 = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6v12" />
    <path d="M12 6v12" />
    <path d="M4 12h8" />
    <path d="M17 9h2v9" />
    <path d="M17 18h4" />
  </svg>
);
export const IconHeading2 = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6v12" />
    <path d="M12 6v12" />
    <path d="M4 12h8" />
    <path d="M16 10a2 2 0 0 1 4 0c0 1.5-4 3-4 6h4" />
  </svg>
);
export const IconHeading3 = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6v12" />
    <path d="M12 6v12" />
    <path d="M4 12h8" />
    <path d="M16 9a2 2 0 1 1 2 3 2 2 0 1 1-2 3" />
  </svg>
);
export const IconInfoCircle = (p: IconProps) => (
  <svg
    width={p.size ?? 20}
    height={p.size ?? 20}
    viewBox="0 0 24 24"
    fill="none"
    className={p.className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 11v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" />
  </svg>
);
