"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A grouped menu that drops out of the header.
 *
 * This is what makes the header scale: the bar itself keeps four buttons, and
 * every other destination lives in one of these — one panel per theme, with the
 * icon, the label and a line saying what it is for.
 *
 * Opens on click (a deliberate choice: hover menus on a projector touchscreen
 * are a trap) and on hover after a short delay for mouse users. Closes on
 * Escape, on an outside click, and whenever the route changes.
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
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      onMouseEnter={() => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        closeTimer.current = setTimeout(() => setOpen(false), 140);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        title={title ?? label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors",
          open || active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
        )}
      >
        {Icon && <Icon className={cn("h-4 w-4", active ? "text-indigo-300" : "text-slate-400")} />}
        <span className="hidden lg:inline">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-[calc(100%+10px)] z-50 w-72 origin-top rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl",
            "animate-fade-up",
            panelClassName,
            align === "right" ? "right-0" : "left-0"
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
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
