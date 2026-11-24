import type { ReactNode } from "react";

type IconProps = { className?: string };

function Outline({ className = "h-5 w-5", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function Solid({ className = "h-5 w-5", children }: IconProps & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  );
}

/* ---------- UI icons ---------- */
export const UserIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.5-8 5.6 0 .8.6 1.4 1.4 1.4h13.2c.8 0 1.4-.6 1.4-1.4 0-3.1-3.6-5.6-8-5.6Z" />
  </Solid>
);
export const MailIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M3.5 5h17A1.5 1.5 0 0 1 22 6.5v.3l-10 6.1L2 6.8v-.3A1.5 1.5 0 0 1 3.5 5ZM2 9.1V17.5A1.5 1.5 0 0 0 3.5 19h17a1.5 1.5 0 0 0 1.5-1.5V9.1l-9.5 5.8a1 1 0 0 1-1 0L2 9.1Z" />
  </Solid>
);
export const PhoneIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M6.6 2.2c.6-.2 1.3 0 1.7.6l2 3.1c.4.6.3 1.4-.2 1.9L8.6 9.3a12.5 12.5 0 0 0 6.1 6.1l1.5-1.5c.5-.5 1.3-.6 1.9-.2l3.1 2c.6.4.8 1.1.6 1.7l-.7 2.1c-.3.9-1.2 1.5-2.2 1.4C10.5 20.3 3.7 13.5 3.1 5.1 3 4.1 3.6 3.2 4.5 2.9l2.1-.7Z" />
  </Solid>
);
export const LockIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Zm3 3.5a1.5 1.5 0 0 1 .8 2.8V18a.8.8 0 0 1-1.6 0v-1.7a1.5 1.5 0 0 1 .8-2.8Z" />
  </Solid>
);
export const MapPinIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.3 6.2 11.6 6.9 12.2.3.3.9.3 1.2 0 .7-.6 6.9-6.9 6.9-12.2A7.5 7.5 0 0 0 12 2Zm0 10.3a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z" />
  </Solid>
);
export const AtIcon = (p: IconProps) => (
  <Outline {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9" />
  </Outline>
);
export const SendIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M21.7 2.3a1 1 0 0 0-1-.2l-18 6.5a1 1 0 0 0-.1 1.8l7.3 3.7 3.7 7.3a1 1 0 0 0 1.8-.1l6.5-18a1 1 0 0 0-.2-1Zm-10 9.4L6 8.9l11.4-4.1-5.7 6.9Z" />
  </Solid>
);
export const LoginIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
  </Outline>
);
export const KeyIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M15.5 2a6.5 6.5 0 0 0-6.2 8.5L2.3 17.5a1 1 0 0 0-.3.7V21a1 1 0 0 0 1 1h2.8a1 1 0 0 0 1-1v-1h1a1 1 0 0 0 1-1v-1h1a1 1 0 0 0 .7-.3l1.2-1.2A6.5 6.5 0 1 0 15.5 2Zm1.5 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
  </Solid>
);
export const EyeIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Outline>
);
export const EyeOffIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7a12.6 12.6 0 0 1-3.1 4.3M6.2 6.2C4 7.6 2.6 9.8 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1" />
  </Outline>
);
export const CheckIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M5 13l4 4L19 7" />
  </Outline>
);
export const MenuIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Outline>
);
export const CloseIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Outline>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M6 9l6 6 6-6" />
  </Outline>
);
export const LogoutIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Outline>
);
export const ShieldIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M12 3l7 3v5c0 5-3.2 8.7-7 10-3.8-1.3-7-5-7-10V6l7-3Z" />
    <path d="M9.5 12l1.8 1.8L15 10" />
  </Outline>
);
export const CalendarIcon = (p: IconProps) => (
  <Outline {...p}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Outline>
);
export const ReceiptIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3Z" />
    <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
  </Outline>
);
export const RefreshIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
    <path d="M21 3v5h-5" />
  </Outline>
);
export const GridIcon = (p: IconProps) => (
  <Outline {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Outline>
);
export const BellIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2a7 7 0 0 0-7 7v4.3l-1.6 2.1A1 1 0 0 0 4.2 17h15.6a1 1 0 0 0 .8-1.6L19 13.3V9a7 7 0 0 0-7-7Zm0 20a3 3 0 0 0 2.8-2H9.2A3 3 0 0 0 12 22Z" />
  </Solid>
);
export const CrownIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M3 7l4.5 3.5L12 4l4.5 6.5L21 7l-2 11a1.5 1.5 0 0 1-1.5 1.2h-11A1.5 1.5 0 0 1 5 18L3 7Z" />
  </Solid>
);
export const SettingsIcon = (p: IconProps) => (
  <Outline {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Outline>
);
export const MegaphoneIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M20 4a1 1 0 0 0-1.4-.2L11 9H6a3 3 0 0 0 0 6h1.2l1.4 4.3a1 1 0 0 0 1 .7h1.6a1 1 0 0 0 .9-1.3L10.8 15h.2l7.6 5.2A1 1 0 0 0 20 19.4V4Z" />
  </Solid>
);
export const PlusIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M12 5v14M5 12h14" />
  </Outline>
);
export const SearchIcon = (p: IconProps) => (
  <Outline {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Outline>
);
export const InfoIcon = (p: IconProps) => (
  <Outline {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </Outline>
);
export const ShieldLockIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2.2 4.5 5.4v5.7c0 5 3.2 9.4 7.5 10.7 4.3-1.3 7.5-5.7 7.5-10.7V5.4L12 2.2Zm0 5.3a2.5 2.5 0 0 1 2.5 2.5v1h.5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1h.5v-1A2.5 2.5 0 0 1 12 7.5Zm-1 3.5h2v-1a1 1 0 1 0-2 0v1Z" />
  </Solid>
);
export const WhistleIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M15 6H9.5A5.5 5.5 0 1 0 15 11.5v-.5h5.2a1.3 1.3 0 0 0 1.3-1.3V7.3A1.3 1.3 0 0 0 20.2 6H15Zm-5.5 8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM11 2.5a.8.8 0 0 1 .8.8v1.2a.8.8 0 0 1-1.6 0V3.3a.8.8 0 0 1 .8-.8Zm3.8 1a.8.8 0 0 1 .2 1.1l-.7 1a.8.8 0 0 1-1.3-.9l.7-1a.8.8 0 0 1 1.1-.2Z" />
  </Solid>
);
export const JerseyIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M8.5 3.5 5 5.3 2.5 9l3 2 1.5-1.5V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.5L18.5 11l3-2L19 5.3l-3.5-1.8a3.5 3.5 0 0 1-7 0Z" />
  </Solid>
);
export const HistoryIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l3 2" />
  </Outline>
);
export const BarChartIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M4 13a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7Zm6-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V8Zm6-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4Z" />
  </Solid>
);
export const TrendUpIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M3 17l6-6 4 4 7-8" />
    <path d="M14 7h6v6" />
  </Outline>
);
export const DownloadIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M12 3v12m0 0-4-4m4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Outline>
);
export const EditIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
  </Outline>
);
export const FilterIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" />
  </Outline>
);
export const MoreVerticalIcon = (p: IconProps) => (
  <Solid {...p}>
    <circle cx="12" cy="5" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="12" cy="19" r="1.7" />
  </Solid>
);
export const PrinterIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="7" rx="1" />
  </Outline>
);
export const ClockIcon = (p: IconProps) => (
  <Outline {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Outline>
);

/* ---------- Navigation icons ---------- */
export const HomeIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M11.3 2.3a1 1 0 0 1 1.4 0l9 8.5a1 1 0 0 1-.7 1.7h-1.5V20a1 1 0 0 1-1 1h-4v-5.5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1V21h-4a1 1 0 0 1-1-1v-7.5H3a1 1 0 0 1-.7-1.7l9-8.5Z" />
  </Solid>
);
export const UsersIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-4 0-7 2-7 4.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.5C16 15 13 13 9 13Zm8 0c-.6 0-1.1 0-1.6.1 1.6 1.1 2.6 2.6 2.6 4.4V20h3a1 1 0 0 0 1-1v-1c0-2.5-2.2-5-5-5Z" />
  </Solid>
);
export const TrophyIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M7 2h10a1 1 0 0 1 1 1v1h3a1 1 0 0 1 1 1v2a5 5 0 0 1-4.6 5A6 6 0 0 1 13 15.9V18h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h3v-2.1A6 6 0 0 1 6.6 12 5 5 0 0 1 2 7V5a1 1 0 0 1 1-1h3V3a1 1 0 0 1 1-1ZM4 6v1a3 3 0 0 0 2 2.8V6H4Zm16 0h-2v3.8A3 3 0 0 0 20 7V6Z" />
  </Solid>
);
export const ImageIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM4 17.5V19h16v-3.6l-4.3-4.3a1 1 0 0 0-1.4 0L9 16.4l-1.8-1.8a1 1 0 0 0-1.4 0L4 16.4v1.1Z" />
  </Solid>
);

/* ---------- Feature icons ---------- */
export const BallIcon = (p: IconProps) => (
  <Outline {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5l3.8 2.7-1.4 4.5H9.6l-1.4-4.5L12 7.5ZM12 3v4.5M15.8 10.2l4.6-1.6M14.4 14.7l2.8 3.9M9.6 14.7l-2.8 3.9M8.2 10.2 3.6 8.6" />
  </Outline>
);
export const HandshakeIcon = (p: IconProps) => (
  <Outline {...p}>
    <path d="M2 11l4-4 3 1M22 11l-4-4-5 1-3.5 3.5a1.5 1.5 0 0 0 2.1 2.1L14 11.2l4.5 4.3M6 7v7l5.5 5.2a1.5 1.5 0 0 0 2.1 0l4.9-4.7M9 16l-1.5-1.5M11.5 18 10 16.5" />
  </Outline>
);
export const StarIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.1l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
  </Solid>
);

/* ---------- Social icons ---------- */
export const FacebookIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2a10 10 0 0 0-1.6 19.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 12 2Z" />
  </Solid>
);
export const YoutubeIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15.1V8.9l5.4 3.1-5.4 3.1Z" />
  </Solid>
);
export const TiktokIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M16.6 2h-3.3v13.3a2.8 2.8 0 1 1-2-2.7V9.2a6.1 6.1 0 1 0 5.3 6V8.6a7.8 7.8 0 0 0 4.4 1.4V6.7a4.4 4.4 0 0 1-4.4-4.7Z" />
  </Solid>
);
export const DiscordIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M19.3 5.3A16.4 16.4 0 0 0 15.2 4l-.5 1.1a15.2 15.2 0 0 0-5.4 0L8.8 4a16.4 16.4 0 0 0-4.1 1.3C2.1 9.2 1.4 13 1.8 16.7a16.6 16.6 0 0 0 5 2.6l1.1-1.7a10.7 10.7 0 0 1-1.7-.8l.4-.3a11.8 11.8 0 0 0 10.8 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.6 16.6 0 0 0 5-2.6c.5-4.3-.8-8.1-2.9-11.4ZM8.7 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
  </Solid>
);
