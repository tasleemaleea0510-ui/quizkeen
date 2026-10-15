import type { ReactNode, SVGProps } from "react";

/**
 * Handmade icon set.
 *
 * The command console used to be decorated with emoji (crown, shield, spy and
 * so on). Emoji render differently on every OS, can't inherit colour and can't
 * be sized precisely, so this file replaces them with small hand-drawn stroke
 * icons — the same approach the main QuizKeen app takes with line icons.
 *
 * Every icon is 24x24, currentColor, and takes normal SVG props.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function Crown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8z" />
      <path d="M5 19h14" />
    </Svg>
  );
}

export function Shield(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z" />
      <path d="M9.5 12l1.8 1.8 3.4-3.6" />
    </Svg>
  );
}

export function Detective(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10.5" cy="11" r="6" />
      <path d="M10.5 5v-2M6 7L4.5 5.5M15 7l1.5-1.5M15.5 14.5L21 20" />
    </Svg>
  );
}

export function Eye(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12S18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function Users(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16 5.5a3 3 0 010 5.6M17.5 14.6c2 .7 3.5 2.3 3.5 4.9" />
    </Svg>
  );
}

export function Chat(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20.5 12.5c0 3.9-3.8 7-8.5 7-1 0-2-.1-2.9-.4L4 21l1.3-3.6A6.7 6.7 0 013.5 12.5c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7z" />
    </Svg>
  );
}

export function Megaphone(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10.5v3a1.5 1.5 0 001.5 1.5H7l8 4V5l-8 4H5.5A1.5 1.5 0 004 10.5z" />
      <path d="M18 8.5c1.6.7 2.5 1.9 2.5 3.5s-.9 2.8-2.5 3.5" />
      <path d="M8 15.5V19" />
    </Svg>
  );
}

export function Scroll(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h11a2 2 0 012 2v13a3 3 0 003 0V7" />
      <path d="M6 3a2 2 0 00-2 2v13a2 2 0 002 2h11" />
      <path d="M8 8h7M8 12h7M8 16h4" />
    </Svg>
  );
}

export function Chart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <rect x="7" y="12" width="3" height="5" rx="1" />
      <rect x="12" y="8" width="3" height="9" rx="1" />
      <rect x="17" y="14" width="3" height="3" rx="1" />
    </Svg>
  );
}

export function Pray(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4l3 6-1 8h-4l-1-8 3-6z" />
      <path d="M9 10L5.5 12.5 7 20M15 10l3.5 2.5L17 20" />
    </Svg>
  );
}

export function Keypad(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </Svg>
  );
}

export function Target(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.2" />
    </Svg>
  );
}

export function Cards(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="7" y="3" width="11" height="15" rx="2" />
      <path d="M6 6H5a2 2 0 00-2 2v11a2 2 0 002 2h9a2 2 0 002-2v-1" />
      <path d="M10 7h5M10 11h5" />
    </Svg>
  );
}

export function Gamepad(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 8h10a4.5 4.5 0 014.4 5.4l-.5 3a2.6 2.6 0 01-4.6 1L15 16H9l-1.3 1.4a2.6 2.6 0 01-4.6-1l-.5-3A4.5 4.5 0 017 8z" />
      <path d="M8.5 12h2M9.5 11v2M15 11.5h.01M17 13h.01" />
    </Svg>
  );
}

export function Sparkles(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3z" />
      <path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </Svg>
  );
}

export function Coins(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="9" cy="7.5" rx="5" ry="2.8" />
      <path d="M4 7.5v4c0 1.5 2.2 2.8 5 2.8s5-1.3 5-2.8v-4" />
      <ellipse cx="15.5" cy="15" rx="5" ry="2.8" />
      <path d="M10.5 15v3.5c0 1.5 2.2 2.8 5 2.8s5-1.3 5-2.8V15" />
    </Svg>
  );
}

export function Graduation(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4L2.5 9 12 14l9.5-5L12 4z" />
      <path d="M6 11v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
    </Svg>
  );
}

export function Clock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function Gift(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="9" width="17" height="11" rx="2" />
      <path d="M3.5 13h17M12 9v11" />
      <path d="M12 9c-3.5 0-5-1-5-2.4S8.2 4.5 9.4 5.4C10.6 6.3 12 9 12 9zM12 9c3.5 0 5-1 5-2.4S15.8 4.5 14.6 5.4C13.4 6.3 12 9 12 9z" />
    </Svg>
  );
}

export function Ban(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.2 17.8L17.8 6.2" />
    </Svg>
  );
}

export function Check(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}

export function Cross(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function Pencil(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20l1-4.5L16.5 4a2 2 0 012.8 0l.7.7a2 2 0 010 2.8L8.5 19 4 20z" />
      <path d="M14.5 6l3.5 3.5" />
    </Svg>
  );
}

export function Warning(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4l9 16H3l9-16z" />
      <path d="M12 10v4M12 17h.01" />
    </Svg>
  );
}

export function Video(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6.5" width="12" height="11" rx="2.5" />
      <path d="M15 12l5.5-3.5v7L15 12z" />
    </Svg>
  );
}

export function Mute(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 9.5h3L12 6v12l-4-3.5H5a1 1 0 01-1-1v-3a1 1 0 011-1z" />
      <path d="M16 9.5l4 5M20 9.5l-4 5" />
    </Svg>
  );
}

export function Sound(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 9.5h3L12 6v12l-4-3.5H5a1 1 0 01-1-1v-3a1 1 0 011-1z" />
      <path d="M15.5 9.5a3.5 3.5 0 010 5M18 7a7 7 0 010 10" />
    </Svg>
  );
}

export function Pin(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 3h6l-1 6 3 3v2h-4v7l-1 1-1-1v-7H7v-2l3-3-1-6z" />
    </Svg>
  );
}

export function Note(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 3.5h9l5 5v12a1.5 1.5 0 01-1.5 1.5h-12A1.5 1.5 0 014 20.5v-15A2 2 0 015 3.5z" />
      <path d="M14 3.5V9h5" />
      <path d="M8 13h8M8 17h5" />
    </Svg>
  );
}

export function Key(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="8" cy="8" r="4.5" />
      <path d="M11.2 11.2L20 20M17 17l-2 2M20 20l-1.5 1.5" />
    </Svg>
  );
}

export function Globe(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5z" />
    </Svg>
  );
}

export function Refresh(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 12a8 8 0 11-2.6-5.9" />
      <path d="M20 4v4.5h-4.5" />
    </Svg>
  );
}

export function Ghost(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 19V11a7 7 0 1114 0v8l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2L5 19z" />
      <path d="M9.5 10h.01M14.5 10h.01" />
    </Svg>
  );
}

export function Snowflake(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
      <path d="M12 6.5l2-2M12 6.5l-2-2M12 17.5l2 2M12 17.5l-2 2" />
    </Svg>
  );
}

export function Flame(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3s5 4.2 5 9a5 5 0 01-10 0c0-2 1-3.4 1-3.4s.6 1.4 1.6 1.4C10.8 10 12 7 12 3z" />
    </Svg>
  );
}

export function Search(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L20.5 20.5" />
    </Svg>
  );
}

export function Sliders(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 4v6M5 14v6M12 4v9M12 17v3M19 4v3M19 11v9" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="15" r="2" />
      <circle cx="19" cy="9" r="2" />
    </Svg>
  );
}

export function Hourglass(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3h10M7 21h10" />
      <path d="M7 3v3.5c0 2.8 5 5 5 5.5s-5 2.7-5 5.5V21M17 3v3.5c0 2.8-5 5-5 5.5s5 2.7 5 5.5V21" />
    </Svg>
  );
}

export function Smile(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 13.5a4 4 0 007 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </Svg>
  );
}

export function Inbox(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 6.5h17v11a2 2 0 01-2 2h-13a2 2 0 01-2-2v-11z" />
      <path d="M3.5 13h4.5l1.2 2h5.6l1.2-2h4.5" />
    </Svg>
  );
}

export function Handshake(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 12l3-3 3 3-3 3-3-3z" />
      <path d="M21 12l-3-3-3 3 3 3 3-3z" />
      <path d="M9 12l2-2 2 2-2 2-2-2z" />
      <path d="M6 9l3-3 3 3M15 9l-3-3M12 15l3 3 3-3" />
    </Svg>
  );
}

export function Eraser(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 20l3-3-8-8 5-5 8 8 2 2-5 6H8z" />
      <path d="M10 20h11" />
      <path d="M6 9l4-4" />
    </Svg>
  );
}

export function Mail(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.6 7l8.4 6 8.4-6" />
    </Svg>
  );
}

export function Lock(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 118 0v3" />
      <path d="M12 14.5v2.5" />
    </Svg>
  );
}

export function Unlock(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 017.7-1.5" />
      <path d="M12 14.5v2.5" />
    </Svg>
  );
}

export function Send(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12l16-8-6 16-2.6-6.2L4 12z" />
      <path d="M11.4 13.8L20 4" />
    </Svg>
  );
}

/** Question mark in a circle — the "what does this button do?" button. */
export function Help(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.6a2.6 2.6 0 114.2 2.2c-1 .8-1.7 1.3-1.7 2.5" />
      <path d="M12 17.5h.01" />
    </Svg>
  );
}

export function Dot({ online = false, ...p }: IconProps & { online?: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width="1em" height="1em" aria-hidden="true" focusable="false" {...p}>
      <circle cx="6" cy="6" r="4" fill={online ? "#34d399" : "#64748b"} />
    </svg>
  );
}

export function Spinner(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5a8.5 8.5 0 108.5 8.5" />
    </Svg>
  );
}
