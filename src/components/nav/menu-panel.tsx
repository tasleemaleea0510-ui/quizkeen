"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A grouped menu that drops out of the header.
 *
 * This is what makes the header scale: the bar itself keeps a few buttons, and
 * every other destination lives in one of these — one panel per theme, with the
 * icon, the label and a line saying what it is for.
 *
 * Opens on click (a deliberate choice: hover menus on a projector touchscreen
 * are a trap) and on hover after a short delay for mouse users. Closes on
 * Escape, on an outside click, and whenever the route changes.
 *
 * The panel is rendered into `document.body` rather than next to its trigger.
 * That is not decoration: the header's rail scrolls sideways
 * (`overflow-x: auto`), and a scrolling box clips its absolutely positioned
 * children on *both* axes — so the "Mer" menu opened, set `aria-expanded`,
 * and was then cut off the moment it left the 64 px bar. It looked like a dead
 * button. Portalling it out of the scroller means no ancestor can ever clip it.
 */
export default function MenuPanel({
  label,
  icon: Icon,
  children,
  active,
  align = "left",
  className,
  panelClassName,
  chevron = true,
  title,
  trigger,
  triggerClassName,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  active?: boolean;
  align?: "left" | "right";
  className?: string;
  /** Overrides the panel's default `w-72`, for the wide "everything" menu. */
  panelClassName?: string;
  hideLabel?: boolean;
  chevron?: boolean;
  /** Tooltip on the trigger — useful when the label is hidden. */
  title?: string;
  /**
   * Draws the trigger itself instead of the icon + label.
   *
   * The header's player pill and its rail tabs are too shaped to be described
   * by `icon` and `label`, so they pass the whole trigger in. `data-active` is
   * still set on the button, which is what the `rail-pill` styles read.
   */
  trigger?: ReactNode;
  /** Classes for the trigger button; ignored when `trigger` is not given. */
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  // The portal needs a DOM to point at, and the server render does not have
  // one. Mounting flips this after hydration, so the two renders agree.
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hover opens the panel, so a click on the trigger that follows the pointer
  // used to *close* the thing the pointer had just opened. The first click after
  // a hover now pins it instead.
  const hoverOpened = useRef(false);

  useEffect(() => setMounted(true), []);

  /** Park the panel directly under its trigger, in viewport coordinates. */
  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 10,
      left: align === "right" ? undefined : Math.max(8, r.left),
      right: align === "right" ? Math.max(8, window.innerWidth - r.right) : undefined,
    });
  };

  useEffect(() => {
    if (!open) return;
    place();
    // The header is sticky, but the viewport can still change under the panel
    // (a rotation, a resize, a keyboard opening). Following is cheaper than
    // closing and making the person press the button again.
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align]);

  // Keep the panel on screen. A right-aligned menu opens with its right edge
  // under the trigger's, which walks off the left of the window as soon as the
  // trigger is near that edge; the same happens mirrored on the other side.
  // Measuring the rendered panel is the only way to know how wide it ended up.
  useEffect(() => {
    if (!open || !pos) return;
    const el = panelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    if (r.left < pad && pos.left !== pad) {
      setPos({ top: pos.top, left: pad, right: undefined });
    } else if (r.right > window.innerWidth - pad && pos.right !== pad) {
      setPos({ top: pos.top, right: pad, left: undefined });
    }
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // The panel is no longer a DOM child of the trigger, so both have to be
      // asked — otherwise mousedown on a link would close the panel before the
      // click could follow it.
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const keepOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <div
      ref={anchorRef}
      className={cn("relative", className)}
      onMouseEnter={() => {
        keepOpen();
        if (!open) hoverOpened.current = true;
        setOpen(true);
      }}
      onMouseLeave={closeSoon}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        title={title ?? label}
        data-active={active ? "true" : "false"}
        onClick={() => {
          if (open && hoverOpened.current) {
            hoverOpened.current = false;
            return;
          }
          setOpen((v) => !v);
        }}
        className={cn(
          "shrink-0",
          trigger
            ? triggerClassName
            : cn(
                "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors",
                open || active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              )
        )}
      >
        {trigger ?? (
          <>
            {Icon && <Icon className={cn("h-4 w-4", active ? "text-indigo-300" : "text-slate-400")} />}
            <span className="hidden lg:inline">{label}</span>
            {chevron && (
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
            )}
          </>
        )}
      </button>

      {mounted &&
        open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              right: pos.right,
              // Never taller than the room left under the button, or a long
              // menu would open off the bottom of a projector screen.
              maxHeight: `calc(100vh - ${pos.top + 12}px)`,
            }}
            onMouseEnter={keepOpen}
            onMouseLeave={closeSoon}
            onClick={() => setOpen(false)}
            className={cn(
              "z-[60] w-72 origin-top overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl",
              "animate-fade-up no-scrollbar",
              panelClassName
            )}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
}

/** One row inside a `MenuPanel`. */
export function MenuLink({
  href,
  icon: Icon,
  label,
  hint,
  active,
}: {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={cn(
        "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
        active ? "bg-white/10" : "hover:bg-white/[0.07]"
      )}
    >
      {Icon && (
        <span
          className={cn(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]",
            active ? "text-indigo-300" : "text-slate-400 group-hover:text-indigo-300"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-slate-400">{hint}</span>}
      </span>
    </Link>
  );
}

/** A labelled cluster of links inside a panel. */
export function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-1 py-1.5">
      <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {children}
    </div>
  );
}
